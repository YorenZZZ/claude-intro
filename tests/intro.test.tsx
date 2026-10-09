import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

// 2026-10-09 12:00 UTC: 20:00 at UTC+8 (evening), 07:00 at UTC-5 (morning).
const EVENING_UTC = Date.UTC(2026, 9, 9, 12, 0, 0)

const BAND = {
  plugin: 'claude-intro',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 19 },
    view: {},
  },
  viewport: { columns: 105, rows: 40 },
} as const

// What sits beneath the plugin in a session: the engine's own empty band.
function engineBeneath(on: On) {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('ui.message', () => ({}))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine band</Text>
  })
}

test('desktop: the awakening cut-in plays, greets, then the band closes', async ($, on) => {
  const clock = mock.clock(on, { now: EVENING_UTC })
  engineBeneath(on)
  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: false })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const svg = await ui.find({ type: 'Svg' })
  expect(svg?.props.isInteractive).toBe(true)
  expect(String(svg?.props.source)).toContain('晚上好。')
  expect(String(svg?.props.source)).toContain('@keyframes slam')
  expect(String(svg?.props.source)).toContain('data:image/webp;base64,')
  // Svg refuses a source past 131072 characters.
  expect(String(svg?.props.source).length).toBeLessThan(131_072)
  expect(await ui.find({ type: 'Text', text: /engine band/ })).toBeUndefined()

  await ui.advance(6600)
  expect(await ui.find({ type: 'Svg' })).toBeDefined()
  await ui.advance(200)
  expect(await ui.find({ type: 'Svg' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /engine band/ })).toBeDefined()
  await clock.advance(60_000)
  await ui.unmount()
})

test('terminal: a text avatar slides in and types the greeting', async ($, on) => {
  mock.clock(on, { now: EVENING_UTC })
  engineBeneath(on)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.advance(3000)
  expect(await ui.find({ type: 'Text', text: /\(•‿•\)|\(-‿-\)/, in: 'text-1' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /晚上好！/, in: 'text-1' })).toBeDefined()

  await ui.advance(3800)
  expect(await ui.find({ type: 'Text', text: /engine band/ })).toBeDefined()
  await ui.unmount()
})

test('the band stays out of the way of a survey, and closes on its own if never drawn', async ($, on) => {
  const clock = mock.clock(on, { now: EVENING_UTC })
  engineBeneath(on)
  await $.session.start({ cwd: '/tmp', surface: null, isInteractive: false })

  const survey = await $.ui.mount({ ...BAND, surface: 'desktop', props: { ...BAND.props, hasSurvey: true } })
  expect(await survey.find({ type: 'Svg' })).toBeUndefined()
  await survey.unmount()

  await clock.advance(46_000)
  const later = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await later.find({ type: 'Svg' })).toBeUndefined()
  await later.unmount()
})

test('it greets by the time at the configured offset', { options: { utcOffset: -5 } }, async ($, on) => {
  mock.clock(on, { now: EVENING_UTC })
  engineBeneath(on)
  await $.session.start({ cwd: '/tmp', surface: 'desktop', isInteractive: false })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const source = String((await ui.find({ type: 'Svg' }))?.props.source)
  expect(source).toContain('早上好。')
  await ui.unmount()
})
