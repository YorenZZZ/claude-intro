// Claude Intro: plays the "second awakening" cut-in over the Claude desktop
// app's window while the app starts and its main view is still loading.
//
// Runs as a background agent (no Dock icon) that opens at login. When a new
// Claude process appears it covers the window Claude is about to open (the
// frame Claude saved last time, then the real window once it exists) with a
// borderless panel for about 6.7 seconds. A click skips it.
//
//   claude-intro               background agent (the normal mode)
//   claude-intro --play        play once now over Claude's window, then quit
//   claude-intro --snapshot D  play over a 1280x800 stand-in window, saving a
//                              frame every 0.1s into folder D (README previews)
//   claude-intro --uninstall   stop opening at login, then quit
//   claude-intro --watch ID    agent that reacts to another app (for testing)
import AppKit
import ServiceManagement
import WebKit

let claudeBundleID = "com.anthropic.claudefordesktop"
let durationSeconds = 6.7

enum Log {
  static let url: URL = {
    let folder = FileManager.default.homeDirectoryForCurrentUser
      .appendingPathComponent("Library/Logs/Claude Intro", isDirectory: true)
    try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
    return folder.appendingPathComponent("app.log")
  }()

  static func write(_ message: String) {
    let line = "\(ISO8601DateFormatter().string(from: Date())) \(message)\n"
    guard let data = line.data(using: .utf8) else { return }
    if let handle = try? FileHandle(forWritingTo: url) {
      handle.seekToEndOfFile()
      handle.write(data)
      try? handle.close()
    } else {
      try? data.write(to: url)
    }
  }
}

// Where the app's window is, in Cocoa screen coordinates.
enum AppWindow {
  // Quartz and Electron measure from the top-left of the main display; Cocoa
  // from its bottom-left.
  static func cocoa(_ rect: CGRect) -> NSRect {
    let mainHeight = NSScreen.screens.first?.frame.height ?? rect.maxY
    return NSRect(x: rect.minX, y: mainHeight - rect.maxY, width: rect.width, height: rect.height)
  }

  // The largest normal window the process has on screen.
  static func live(pid: pid_t) -> NSRect? {
    guard let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] else { return nil }
    let frames = list.compactMap { info -> CGRect? in
      guard info[kCGWindowOwnerPID as String] as? pid_t == pid,
            info[kCGWindowLayer as String] as? Int == 0,
            let bounds = info[kCGWindowBounds as String] as? NSDictionary,
            let rect = CGRect(dictionaryRepresentation: bounds),
            rect.width >= 300, rect.height >= 200 else { return nil }
      return rect
    }
    return frames.max { $0.width * $0.height < $1.width * $1.height }.map(cocoa)
  }

  // The frame Claude saved when it last closed, which it reopens at.
  static func saved() -> NSRect? {
    let file = FileManager.default.homeDirectoryForCurrentUser
      .appendingPathComponent("Library/Application Support/Claude/window-state.json")
    guard let data = try? Data(contentsOf: file),
          let state = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
    func rect(_ value: Any?) -> CGRect? {
      guard let box = value as? [String: Any],
            let x = box["x"] as? Double, let y = box["y"] as? Double,
            let width = box["width"] as? Double, let height = box["height"] as? Double,
            width >= 300, height >= 200 else { return nil }
      return CGRect(x: x, y: y, width: width, height: height)
    }
    let whole = state["isMaximized"] as? Bool == true || state["isFullScreen"] as? Bool == true
    guard let frame = whole ? rect(state["displayBounds"]) : rect(state) else { return nil }
    let result = cocoa(frame)
    // Only trust it if it is still on a connected screen.
    return NSScreen.screens.contains { $0.frame.intersects(result) } ? result : nil
  }

  static func standIn() -> NSRect {
    let area = (NSScreen.main ?? NSScreen.screens[0]).visibleFrame
    return NSRect(x: area.midX - 640, y: area.midY - 400, width: 1280, height: 800)
  }

  static func fallback() -> NSRect {
    let mouse = NSEvent.mouseLocation
    let screen = NSScreen.screens.first { NSMouseInRect(mouse, $0.frame, false) } ?? NSScreen.main ?? NSScreen.screens[0]
    let area = screen.visibleFrame
    let size = NSSize(width: min(1280, area.width * 0.8), height: min(820, area.height * 0.8))
    return NSRect(x: area.midX - size.width / 2, y: area.midY - size.height / 2, width: size.width, height: size.height)
  }
}

// A panel that never takes focus from the app starting underneath it.
final class IntroPanel: NSPanel {
  override var canBecomeKey: Bool { false }
  override var canBecomeMain: Bool { false }
}

final class IntroPlayer: NSObject, WKScriptMessageHandler {
  private let pid: pid_t?
  private let snapshotFolder: URL?
  private let onFinish: () -> Void
  private var panel: IntroPanel?
  private var webView: WKWebView?
  private var follow: Timer?
  private var shown = false
  private var prepared = false
  private var playing = false
  private var finished = false
  private let began = Date()

  // pid: the app whose window to cover; nil covers a centered stand-in.
  init(pid: pid_t?, snapshotFolder: URL? = nil, onFinish: @escaping () -> Void) {
    self.pid = pid
    self.snapshotFolder = snapshotFolder
    self.onFinish = onFinish
  }

  private func elapsed() -> String { String(format: "%.2fs", Date().timeIntervalSince(began)) }

  func start() {
    guard let page = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") else {
      Log.write("missing web/index.html")
      return finish()
    }
    let panel = IntroPanel(contentRect: NSRect(x: 0, y: 0, width: 800, height: 600), styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
    panel.level = .floating
    panel.isOpaque = false
    panel.backgroundColor = .clear
    panel.hasShadow = false
    panel.hidesOnDeactivate = false
    panel.isReleasedWhenClosed = false
    panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .ignoresCycle]

    let configuration = WKWebViewConfiguration()
    configuration.userContentController.add(self, name: "intro")
    let webView = WKWebView(frame: panel.contentLayoutRect, configuration: configuration)
    webView.autoresizingMask = [.width, .height]
    webView.setValue(false, forKey: "drawsBackground")
    panel.contentView = webView
    webView.loadFileURL(page, allowingReadAccessTo: page.deletingLastPathComponent())
    self.panel = panel
    self.webView = webView

    // Cover the frame Claude reopens at right away; snap to the real window
    // once it exists, and keep following it if it moves.
    if snapshotFolder != nil {
      show(at: AppWindow.standIn())
    } else if let pid {
      if let frame = AppWindow.live(pid: pid) ?? AppWindow.saved() { show(at: frame) }
    } else {
      show(at: AppWindow.saved() ?? AppWindow.fallback())
    }
    follow = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in self?.track() }

    DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
      guard let self, !self.finished, !self.playing else { return }
      Log.write("no window or page after 10s; giving up")
      self.finish()
    }
  }

  private func track() {
    guard let pid, snapshotFolder == nil, !finished else { return }
    guard NSRunningApplication(processIdentifier: pid) != nil else {
      Log.write("app quit")
      return finish()
    }
    guard let frame = AppWindow.live(pid: pid) else { return }
    if !shown {
      show(at: frame)
    } else if let panel, !NSEqualRects(panel.frame, frame) {
      panel.setFrame(frame, display: true)
    }
  }

  private func show(at frame: NSRect) {
    guard let panel else { return }
    panel.setFrame(frame, display: false)
    // It has to be on screen for the page to animate; the page itself is
    // transparent until the band is inserted.
    panel.orderFrontRegardless()
    shown = true
    Log.write("covering \(NSStringFromRect(frame)) at \(elapsed())")
    playIfReady()
  }

  private func playIfReady() {
    guard shown, prepared, !playing else { return }
    playing = true
    webView?.evaluateJavaScript("ClaudeIntro.play(document)")
  }

  func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
    let body = "\(message.body)"
    switch body {
    case "prepared":
      prepared = true
      Log.write("layers decoded at \(elapsed())")
      playIfReady()
    case "ready":
      Log.write("playing at \(elapsed())")
      DispatchQueue.main.asyncAfter(deadline: .now() + durationSeconds + 2) { [weak self] in self?.finish() }
      if let folder = snapshotFolder { captureFrames(into: folder) }
    case "done":
      finish()
    case "skip":
      Log.write("skipped")
      finish(fade: 0.2)
    case let stats where stats.hasPrefix("stats:"):
      Log.write(stats)
    default:
      Log.write("page: \(body)")
      finish()
    }
  }

  private func captureFrames(into folder: URL) {
    try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
    for time in stride(from: 0.0, through: 6.6, by: 0.1) {
      DispatchQueue.main.asyncAfter(deadline: .now() + time) { [weak self] in
        self?.webView?.takeSnapshot(with: nil) { image, error in
          guard let image, let tiff = image.tiffRepresentation, let bitmap = NSBitmapImageRep(data: tiff),
                let png = bitmap.representation(using: .png, properties: [:]) else {
            Log.write("snapshot \(time) failed: \(error?.localizedDescription ?? "no image")")
            return
          }
          try? png.write(to: folder.appendingPathComponent(String(format: "frame-%04.0f.png", time * 1000)))
        }
      }
    }
  }

  private func finish(fade: Double = 0.15) {
    guard !finished else { return }
    finished = true
    follow?.invalidate()
    let panel = self.panel
    NSAnimationContext.runAnimationGroup({ context in
      context.duration = fade
      panel?.animator().alphaValue = 0
    }, completionHandler: { [weak self] in
      panel?.orderOut(nil)
      self?.webView?.configuration.userContentController.removeScriptMessageHandler(forName: "intro")
      self?.webView = nil
      self?.panel = nil
      self?.onFinish()
    })
  }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
  private var watchedBundleID = claudeBundleID
  private var knownProcesses = Set<pid_t>()
  private var observation: NSKeyValueObservation?
  private var player: IntroPlayer?

  func applicationDidFinishLaunching(_ notification: Notification) {
    let arguments = CommandLine.arguments
    if arguments.contains("--uninstall") {
      UserDefaults.standard.set(false, forKey: "openAtLogin")
      do {
        try SMAppService.mainApp.unregister()
        Log.write("unregistered from login items")
      } catch {
        Log.write("unregister failed: \(error.localizedDescription)")
      }
      return NSApp.terminate(nil)
    }
    if arguments.contains("--play") {
      return playIntro(pid: runningClaude()) { NSApp.terminate(nil) }
    }
    if let index = arguments.firstIndex(of: "--snapshot"), index + 1 < arguments.count {
      let folder = URL(fileURLWithPath: arguments[index + 1], isDirectory: true)
      return playIntro(pid: nil, snapshotFolder: folder) { NSApp.terminate(nil) }
    }
    if let index = arguments.firstIndex(of: "--watch"), index + 1 < arguments.count {
      watchedBundleID = arguments[index + 1]
    } else if otherAgentIsRunning() {
      Log.write("another agent is already running; quitting")
      return NSApp.terminate(nil)
    } else {
      openAtLogin()
    }
    watch()
  }

  private func runningClaude() -> pid_t? {
    NSRunningApplication.runningApplications(withBundleIdentifier: claudeBundleID).first?.processIdentifier
  }

  private func otherAgentIsRunning() -> Bool {
    let me = ProcessInfo.processInfo.processIdentifier
    return NSRunningApplication.runningApplications(withBundleIdentifier: Bundle.main.bundleIdentifier ?? "")
      .contains { $0.processIdentifier != me }
  }

  // Registers again after a rebuild changes the ad-hoc signature.
  private func openAtLogin() {
    guard UserDefaults.standard.object(forKey: "openAtLogin") as? Bool ?? true else { return }
    guard SMAppService.mainApp.status != .enabled else { return }
    do {
      try SMAppService.mainApp.register()
      Log.write("registered to open at login")
    } catch {
      Log.write("login item registration failed: \(error.localizedDescription)")
    }
  }

  private func watchedProcesses() -> Set<pid_t> {
    Set(NSWorkspace.shared.runningApplications
      .filter { $0.bundleIdentifier == watchedBundleID }
      .map(\.processIdentifier))
  }

  // runningApplications changes as soon as the process starts, before its
  // first window, so the panel is up before the app has drawn anything.
  private func watch() {
    knownProcesses = watchedProcesses()
    Log.write("watching \(watchedBundleID); already running: \(knownProcesses.sorted())")
    observation = NSWorkspace.shared.observe(\.runningApplications, options: [.new]) { [weak self] _, _ in
      DispatchQueue.main.async { self?.processesChanged() }
    }
  }

  private func processesChanged() {
    let current = watchedProcesses()
    let started = current.subtracting(knownProcesses)
    knownProcesses = current
    guard let pid = started.first else { return }
    Log.write("\(watchedBundleID) started: \(pid)")
    guard player == nil else { return }
    playIntro(pid: pid) {}
  }

  private func playIntro(pid: pid_t?, snapshotFolder: URL? = nil, then done: @escaping () -> Void) {
    let player = IntroPlayer(pid: pid, snapshotFolder: snapshotFolder) { [weak self] in
      self?.player = nil
      Log.write("finished")
      done()
    }
    self.player = player
    player.start()
  }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory)
app.run()
