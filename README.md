# claude-intro · Claude 桌面版二次觉醒启动动画

打开 Claude 桌面 App 时，先在它的窗口上演一段横版动作网游「二次觉醒」式的立绘演出，再打出一句欢迎语，约 6.7 秒后收起，露出已经加载好的主界面。点一下可以跳过。

![启动动画预览](docs/preview.webp)

> 静态截图：[docs/preview-still.jpg](docs/preview-still.jpg)

## 安装

需要 macOS 14 或更新版本，以及 Xcode 命令行工具（没有的话先运行 `xcode-select --install`）。

```bash
git clone https://github.com/YorenZZZ/claude-intro.git
cd claude-intro
./build.sh --install
```

脚本会编译出 `Claude Intro.app`（同时支持 Apple 芯片和 Intel），放进「应用程序」并启动。它没有 Dock 图标，在后台常驻，第一次运行时把自己登记为登录项，系统会提示「已添加后台项目」。之后每次打开 Claude 桌面 App 都会自动播放。

## 使用

- 欢迎语按这台 Mac 的本地时间问候早上好、中午好、下午好、晚上好或夜深了，后面随机接一句台词。
- 不想等 Claude 重启，也可以直接预览一次：

  ```bash
  open -n "/Applications/Claude Intro.app" --args --play
  ```

- 运行记录在 `~/Library/Logs/Claude Intro/app.log`，包括每次检测到 Claude 启动、开始播放的耗时和帧率。

## 卸载

```bash
./build.sh --uninstall
```

这会把它从登录项里移除、退出后台进程，并把 App 移到废纸篓。也可以只在「系统设置 → 通用 → 登录项」里关掉它。

## 工作原理

- 后台小程序监听新启动的 Claude 进程。进程一出现，就按 Claude 上次退出时记下的窗口位置盖上一个无边框浮层；真实窗口出现后贴合它，播放期间窗口被拖动也会跟着走。
- 浮层不抢焦点，Claude 照常在下面加载。
- 动画用 WebKit 渲染。轮廓光、投影、残影、白闪这些滤镜效果预先烘焙成透明图层，播放时只改变位置、缩放和透明度，全部交给 GPU 合成，所以在大窗口上也能保持流畅。

## 换成你自己的立绘

1. 准备一张竖版立绘，运行：

   ```bash
   tools/build-portrait.sh <图片> [人物裁剪偏移 X+Y] [无人机裁剪 WxH+X+Y]
   ```

   它用 macOS Vision 抠出人物和无人机，写入 `art/`，再生成 `Resources/web/layers/` 下的各个图层。需要 ImageMagick 和 cwebp（`brew install imagemagick webp`）。
2. 光晕、头发摆动区域和护目镜反光的位置写在 `Resources/web/intro.js` 里，换图后要按新立绘调整，`tools/build-layers.sh` 里的头发遮罩也一样。
3. `tools/make-icon.sh` 用新立绘重新生成 App 图标。
4. 重新运行 `./build.sh --install`。

## 开发

| 文件 | 作用 |
| --- | --- |
| `Sources/main.swift` | 后台小程序：监听 Claude 启动、定位窗口、显示浮层、登录项 |
| `Resources/web/intro.js` | 整段动画：横幅、图层和时间轴，以及问候语 |
| `Resources/web/index.html` | 承载动画的页面和背景遮罩 |
| `Resources/web/layers/` | 预先烘焙好的人物、头发、投影、残影、白闪和无人机图层 |
| `art/` | 抠好的人物与无人机原始图层 |
| `tools/` | 抠图、烘焙图层、生成图标的脚本 |
| `build.sh` | 编译、组装、签名、安装和卸载 |
| `tests/intro.test.cjs` | 问候语、图层引用和「只动画位置与透明度」的检查 |

- 测试：`node --test tests/intro.test.cjs`
- `--snapshot <文件夹>` 会在一个 1280×800 的模拟窗口上播放，并每 0.1 秒存一帧，README 里的预览就是这样生成的。

## 素材与声明

- 立绘是原创角色，由 AI 生成（豆包 Seedream 5.0，经火山引擎调用），再用 macOS Vision 抠图；不包含任何游戏的官方美术。
- 演出风格是向横版动作网游（如《地下城与勇士》）觉醒技能立绘演出致敬的同人作品，与 Nexon、Neople、Anthropic 均无关联。

## License

[MIT](LICENSE)

---

**English:** A small macOS background app that plays a side-scrolling-action-MMO style "second awakening" cut-in over the Claude desktop app's window while it starts: an original AI-generated mechanic character floats as a cut-out layer in front of a slashed panel, then greets you with a random line and folds away after about 6.7 seconds, revealing the loaded app. Install with `./build.sh --install` (macOS 14+, Xcode Command Line Tools); it opens at login and waits for Claude to launch. Preview with `open -n "/Applications/Claude Intro.app" --args --play`; remove with `./build.sh --uninstall`.
