// node --test tests/intro.test.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const intro = require('../Resources/web/intro.js')
const web = path.join(__dirname, '..', 'Resources', 'web')

// CJK characters count 1, ASCII about half; the strip holds about 25.
const width = text => [...text].reduce((sum, char) => sum + (/[\x00-\x7f]/.test(char) ? 0.55 : 1), 0)

test('greets by the local hour', () => {
  const at = hour => intro.introText(new Date(2026, 9, 9, hour), () => 0).title
  assert.equal(at(7), '早上好')
  assert.equal(at(12), '中午好')
  assert.equal(at(15), '下午好')
  assert.equal(at(20), '晚上好')
  assert.equal(at(23), '夜深了')
  assert.equal(at(4), '夜深了')
})

test('picks a random line from the right pool', () => {
  const day = intro.introText(new Date(2026, 9, 9, 15), () => 0.999999)
  assert.equal(day.line, intro.LINES[intro.LINES.length - 1])
  const night = intro.introText(new Date(2026, 9, 9, 2), () => 0)
  assert.equal(night.line, intro.NIGHT_LINES[0])
  const seen = new Set(Array.from({ length: 400 }, () => intro.introText(new Date(2026, 9, 9, 15)).line))
  assert.equal(seen.size, intro.LINES.length)
})

test('every greeting fits its strip', () => {
  for (const line of [...intro.LINES, ...intro.NIGHT_LINES]) {
    assert.ok(width(line) <= 16, `${line} is too long`)
  }
})

test('the markup uses every baked layer and escapes the greeting', () => {
  const markup = intro.introMarkup({ title: '下午好', line: '<b>"x"</b>' })
  for (const name of ['body', 'hair', 'shadow', 'ghost', 'white', 'drone']) {
    assert.ok(markup.includes(`layers/${name}.webp`), name)
    assert.ok(fs.existsSync(path.join(web, 'layers', `${name}.webp`)), `${name}.webp exists`)
  }
  assert.ok(markup.includes('下午好。&lt;b&gt;&quot;x&quot;&lt;/b&gt;'))
  assert.ok(!markup.includes('<b>'))
})

test('only transforms and opacity are animated, never filters', () => {
  const markup = intro.introMarkup({ title: '下午好', line: '测试' })
  const keyframes = markup.match(/@keyframes[^{]+\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g)
  assert.ok(keyframes.length > 20)
  for (const block of keyframes) {
    const properties = [...block.matchAll(/([a-z-]+)\s*:/g)].map(match => match[1])
    for (const property of properties) {
      assert.ok(['transform', 'opacity', 'stroke-dashoffset'].includes(property), `${block.slice(0, 40)} animates ${property}`)
    }
  }
  assert.ok(!/<animate/.test(markup), 'no SMIL animation')
  assert.ok(!/feTurbulence|feDisplacementMap|feMorphology/.test(markup), 'no per-frame filters')
})
