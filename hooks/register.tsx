import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Intro } from '../types'
import type { IntroClientProps } from './intro-client'
import { introSvg, introText } from './intro-svg'

const intro = atom({ plugin: 'claude-intro', key: 'intro' } as const, {
  phase: 'done',
  run: 0,
  title: '',
  line: '',
})

// The SVG's own timeline ends at 6.6s; the Client closes the band right after.
const DURATION_MS = 6700
// Only if no surface ever drew the band (nobody posted "done").
const FALLBACK_MS = 45_000

async function finish($: EngineInterface, run: number) {
  await update($, intro, (current): Intro => (current.run === run ? { ...current, phase: 'done' } : current))
}

async function play($: EngineInterface, utcOffset: number) {
  const text = introText(await $.clock.now(), utcOffset)
  const next: Intro = await update($, intro, current => ({ phase: 'playing', run: current.run + 1, ...text }))
  $.clock.after(FALLBACK_MS, () => void finish($, next.run))
}

const clientProps = (mode: IntroClientProps['mode'], current: Intro): IntroClientProps => ({
  mode,
  run: current.run,
  durationMs: DURATION_MS,
  title: current.title,
  line: current.line,
})

export const register: Register = (on, options) => {
  const utcOffset = typeof options.utcOffset === 'number' ? options.utcOffset : 8

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'claude-intro', description: '重播 Claude 入场动画' })
    await play($, utcOffset)

    return next(e)
  })

  on('command.run', { command: 'claude-intro' }, async $ => {
    await play($, utcOffset)

    return { text: '已重播 Claude 入场动画。' }
  })

  on('ui.message', async ($, e, next) => {
    const data = e.data
    if (typeof data === 'object' && data !== null && 'done' in data && typeof data.done === 'number') {
      await finish($, data.done)
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const current = await read($, intro)
    if (e.props.hasSurvey || current.phase !== 'playing') return next(e)

    if (e.surface === 'desktop') {
      const { Box, Svg, Client } = $.ui.resolve(e)

      return (
        <Box key={`intro-${current.run}`} flexDirection="column">
          <Svg
            source={introSvg(current, current.run)}
            alt={`Claude 二次觉醒：${current.title}。${current.line}`}
            isInteractive
          />
          <Client key={`timer-${current.run}`} module="./intro-client.tsx" props={clientProps('timer', current)} />
        </Box>
      )
    }

    if (e.surface === 'terminal') {
      const { Client } = $.ui.resolve(e)

      return <Client key={`text-${current.run}`} module="./intro-client.tsx" props={clientProps('text', current)} />
    }

    return next(e)
  })
}
