export type IntroPhase = 'playing' | 'done'

// One playback of the intro: `run` grows on every replay so a new playback
// remounts the drawing and a stale Client's "done" cannot end a newer run.
export type Intro = {
  phase: IntroPhase
  run: number
  title: string
  line: string
}

declare module 'claude-code' {
  interface PluginState {
    'claude-intro': { intro: Intro }
  }
}
