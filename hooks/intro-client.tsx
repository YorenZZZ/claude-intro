import type { ClientModule } from 'claude-code'

// `timer`: draws nothing and only keeps time beside the desktop's SVG, so the
// run ends when the animation really played, not when the session started.
// `text`: the terminal's own little entrance, drawn frame by frame.
export type IntroClientProps = {
  mode: 'timer' | 'text'
  run: number
  durationMs: number
  title: string
  line: string
}

type IntroClientState = { t: number }

const TICK_MS = 100
const SPARKS = ['·', '✢', '✳', '✶', '✻']

const IntroClient: ClientModule<IntroClientProps, IntroClientState> = (props, surface) => {
  const { Box, Text } = surface.elements

  if (surface.state === undefined) {
    let t = 0
    const stop = surface.every(TICK_MS, () => {
      t += TICK_MS
      if (props.mode === 'text') surface.setState({ t })
      if (t >= props.durationMs) {
        stop()
        surface.post({ done: props.run })
      }
    })
    surface.setState({ t: 0 })
  }

  if (props.mode === 'timer') return <Box />

  const t = surface.state?.t ?? 0
  const pad = ' '.repeat(Math.max(0, 16 - Math.floor(t / 50)))
  const spark = SPARKS[Math.min(SPARKS.length - 1, Math.floor(t / 200))] ?? '✻'
  const isBlinking = (t >= 1500 && t < 1700) || (t >= 3400 && t < 3600)
  const isWaving = t >= 1100 && t < 2300 && Math.floor(t / 200) % 2 === 0
  const message = Array.from(`${props.title}！${props.line}`)
  const typed = t < 1300 ? '' : message.slice(0, Math.floor((t - 1300) / 45)).join('')
  const isLeaving = t >= props.durationMs - 500

  return (
    <Box flexDirection="column">
      <Text color="#D97757" dimColor={isLeaving}>{`${pad}  ${spark}`}</Text>
      <Box flexDirection="row">
        <Text color="#D97757" dimColor={isLeaving}>{`${pad}${isBlinking ? '(-‿-)' : '(•‿•)'}${isWaving ? '\\' : '/'}`}</Text>
        <Text dimColor={isLeaving}>{typed ? `  ${typed}` : ' '}</Text>
      </Box>
    </Box>
  )
}

export default IntroClient
