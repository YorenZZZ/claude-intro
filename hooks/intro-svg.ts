import { CHARACTER_WEBP, DRONE_WEBP } from './portrait'

// A side-scrolling-action-game "second awakening" cut-in, drawn as one SVG
// whose CSS / SMIL animation runs in the desktop's sandboxed frame. The
// character is a cut-out layer floating in front of the band: she breaks out
// of its top edge, casts a shadow onto it, and moves at her own depth, the
// band behind her and the drone in front of her at theirs.
// Timeline, seconds from first paint:
//   0.00–0.24  the band opens from a slit, a flash line across it
//   0.10–0.60  slashes and speed lines rush in; the character, her afterimages
//              and shadow slam in from the right, the drone a beat later
//   0.58–0.95  white impact flash and a shockwave
//   0.72–1.05  the skill name slams down, the label and subtitle follow
//   1.35–2.60  the greeting types out on its strip
//   0.90–6.10  idle: she floats and sways above her shadow, wind in her hair,
//              the layers drift apart (parallax), core / tube / eye pulses,
//              goggle glints, embers behind and in front of her
//   6.10–6.60  the band snaps shut and she fades toward the camera (done at 6.7)

export type IntroText = { title: string; line: string }

const LINES = ['系统全开，随时出击！', '核心已超频，今天想造点什么？', '机核就绪，听你指挥。']

// The greeting follows the configured UTC offset (8 for Beijing time).
export function introText(now: number, utcOffset = 8): IntroText {
  const hour = (((Math.floor(now / 3_600_000 + utcOffset) % 24) + 24) % 24)
  if (hour >= 23 || hour < 5) {
    return { title: '夜深了', line: '机核低功耗待命，陪你把事情收个尾。' }
  }
  const greeting = hour < 11 ? '早上好' : hour < 13 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
  const line = LINES[Math.floor(now / 1000) % LINES.length] ?? '系统全开，随时出击！'

  return { title: greeting, line }
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const escape = (text: string) => text.replace(/[&<>"']/g, char => ESCAPES[char] ?? char)

// A fixed pseudo-random stream, so the markup is the same on every redraw.
function stream(seed: number) {
  let state = seed
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648
    return state / 2_147_483_648
  }
}

const n = (value: number) => value.toFixed(1)

function gear(cx: number, cy: number, outer: number, inner: number, teeth: number) {
  const points: string[] = []
  for (let i = 0; i < teeth * 4; i++) {
    const angle = (i / (teeth * 4)) * Math.PI * 2
    const r = i % 4 === 1 || i % 4 === 2 ? outer : inner
    points.push(`${n(cx + Math.cos(angle) * r)},${n(cy + Math.sin(angle) * r)}`)
  }
  return `<polygon points="${points.join(' ')}"/><circle cx="${cx}" cy="${cy}" r="${n(inner * 0.45)}"/>`
}

// Light rays fanning out from behind her chest.
function rays(cx: number, cy: number, count: number, length: number) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2
    const b = a + 0.12
    return `<polygon points="${cx},${cy} ${n(cx + Math.cos(a) * length)},${n(cy + Math.sin(a) * length)} ${n(cx + Math.cos(b) * length)},${n(cy + Math.sin(b) * length)}"/>`
  }).join('')
}

const random = stream(20261009)

const SPEED_LINES = Array.from({ length: 16 }, (_, i) => {
  const y = 84 + i * 11 + random() * 5
  const dash = [['120', '680'], ['40', '760'], ['220', '580'], ['70', '730']][i % 4] ?? ['120', '680']
  const speed = ['sa', 'sb', 'sc'][i % 3]
  const colour = i % 5 === 0 ? '#fff4e0' : '#ff9a3c'
  return `<line class="${speed}" x1="0" y1="${n(y)}" x2="800" y2="${n(y)}" stroke="${colour}" stroke-width="${i % 4 === 2 ? 2 : 1}" stroke-dasharray="${dash.join(' ')}" stroke-dashoffset="${Math.round(random() * 800)}"/>`
}).join('')

function embers(count: number, size: [number, number], area: [number, number, number, number], tag: string) {
  return Array.from({ length: count }, (_, i) => {
    const x = area[0] + random() * area[2]
    const y = area[1] + random() * area[3]
    const r = size[0] + random() * (size[1] - size[0])
    const colour = i % 4 === 0 ? '#fff1cc' : '#ffad4d'
    return `<g transform="translate(${n(x)} ${n(y)})"><circle class="${tag} e${i % 3} d${i % 5}" r="${n(r)}" fill="${colour}"/></g>`
  }).join('')
}

const EMBERS_BACK = embers(22, [0.7, 1.9], [30, 90, 760, 170], 'em')
const EMBERS_FRONT = embers(9, [1.8, 3.4], [430, 60, 360, 240], 'emf')

// Her hair, in the character layer's own pixels (source x, source y - 220):
// the part the wind moves, with her face, goggles and the wrench held still.
function hairShape(hair: string, still: string) {
  return (
    `<path d="M290 480 L380 340 L560 250 L800 230 L1050 300 L1260 460 L1280 780 L1200 980 L1020 1040 L520 1040 L300 960 L250 730 Z" fill="${hair}"/>` +
    `<ellipse cx="750" cy="790" rx="178" ry="205" fill="${still}"/>` +
    `<path d="M450 480 L600 420 L800 430 L915 480 L905 570 L760 590 L620 640 L500 680 L440 600 Z" fill="${still}"/>` +
    `<path d="M960 580 L1540 -30 L1600 110 L1060 680 Z" fill="${still}"/>`
  )
}

// Character layer placement in the band: source pixels scaled by 0.2.
const CHAR = 'translate(476 -4) scale(.2)'
const DRONE = 'translate(724 116) scale(.2)'

const STYLE = `
text{font-family:'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC',sans-serif}
.fb{transform-box:fill-box;transform-origin:center}
.panel{transform-box:view-box;transform-origin:400px 168px;animation:panel 6.6s cubic-bezier(.2,.9,.3,1) both}
.flashline{transform-box:view-box;transform-origin:400px 168px;animation:flashline 6.6s linear both}
.slash{animation:slash .5s cubic-bezier(.2,.9,.3,1) .1s both}
.slash2{animation-delay:.16s}.slash3{animation-delay:.22s}
.gear{animation:spin 22s linear infinite}.gear2{animation:spin 14s linear infinite reverse}
.rays{animation:spin 40s linear infinite}
.burst{animation:pulse 2.6s ease-in-out .6s infinite}
.bgdrift{animation:bgdrift 6.6s ease-out both}
.speed{animation:speed 6.6s linear both}
.sa{animation:dash .42s linear infinite}.sb{animation:dash .7s linear infinite}.sc{animation:dash 1.1s linear infinite}
.pin,.ghost,.pind{transform-box:fill-box;transform-origin:50% 50%}
.pin{animation:pin .44s cubic-bezier(.15,.9,.25,1) .18s both}
.ghost{animation:ghost .7s cubic-bezier(.15,.9,.25,1) .14s both}
.ghost2{animation-delay:.1s;animation-duration:.75s}
.pind{animation:pind .5s cubic-bezier(.15,.9,.25,1) .3s both}
.drift{transform-box:fill-box;transform-origin:50% 100%;animation:drift 6.6s ease-out both}
.float{transform-box:fill-box;transform-origin:50% 100%;animation:float 3.8s ease-in-out .9s infinite}
.sfloat{animation:sfloat 3.8s ease-in-out .9s infinite}
.ddrift{animation:ddrift 6.6s ease-out both}
.dbob{transform-box:fill-box;transform-origin:50% 50%;animation:dbob 2.6s ease-in-out .8s infinite}
.cexit{transform-box:fill-box;transform-origin:50% 60%;animation:cexit 6.6s linear both}
.edge{stroke-dasharray:200;animation:edge .35s ease-out .3s both}
.screen{mix-blend-mode:screen}
.core{animation:pulse 1.7s ease-in-out .6s infinite}
.flare{animation:flare 3.2s linear .6s infinite}
.tube{animation:pulse 1.2s ease-in-out .9s infinite}
.eye{animation:pulse 1.4s ease-in-out .7s infinite}
.glint{animation:glint 6.6s linear both}
.flash{animation:flash 6.6s linear both}
.shock{animation:shock .5s ease-out .58s both}
.title{transform-box:fill-box;transform-origin:0% 60%;animation:slam .36s cubic-bezier(.2,1.3,.4,1) .72s both}
.shine{animation:shine 6.6s linear both}
.label{animation:fromleft .35s ease-out .95s both}
.sub{animation:rise .35s ease-out 1.05s both}
.strip{transform-box:fill-box;transform-origin:0% 50%;animation:strip .3s ease-out 1.2s both}
.em,.emf{opacity:0;animation:ember 3s ease-out infinite}
.emf{animation-name:emberf}
.e1{animation-duration:2.4s}.e2{animation-duration:3.6s}
.d0{animation-delay:.3s}.d1{animation-delay:.8s}.d2{animation-delay:1.3s}.d3{animation-delay:1.9s}.d4{animation-delay:2.5s}
@keyframes panel{0%{transform:scaleY(.015)}3.6%{transform:scaleY(1)}92.4%{transform:scaleY(1);opacity:1}98.5%{transform:scaleY(.015);opacity:1}100%{transform:scaleY(.015);opacity:0}}
@keyframes flashline{0%{opacity:1;transform:scaleX(.2)}3%{opacity:1;transform:scaleX(1)}6%,92%{opacity:0;transform:scaleX(1)}96%{opacity:1}100%{opacity:0}}
@keyframes slash{from{opacity:0;transform:translateX(180px)}to{opacity:1;transform:none}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes bgdrift{from{transform:translateX(10px)}to{transform:translateX(-16px)}}
@keyframes speed{0%{opacity:0}3%,14%{opacity:.95}26%,100%{opacity:.3}}
@keyframes dash{to{stroke-dashoffset:-800}}
@keyframes pin{0%{opacity:0;transform:translateX(380px) skewX(-14deg)}70%{opacity:1;transform:translateX(-14px) skewX(3deg)}100%{opacity:1;transform:none}}
@keyframes ghost{0%{opacity:0;transform:translateX(380px) skewX(-14deg)}35%{opacity:.55}70%{opacity:.35;transform:translateX(30px) skewX(0)}100%{opacity:0;transform:translateX(60px)}}
@keyframes pind{0%{opacity:0;transform:translateX(460px)}70%{opacity:1;transform:translateX(-18px)}100%{opacity:1;transform:none}}
@keyframes drift{0%,10%{transform:none}100%{transform:translateX(7px) scale(1.03)}}
@keyframes float{0%,100%{transform:translateY(0) rotate(-.35deg)}50%{transform:translateY(-6px) rotate(.35deg)}}
@keyframes sfloat{0%,100%{opacity:.95;transform:none}50%{opacity:.62;transform:translate(-4px,4px)}}
@keyframes ddrift{0%,12%{transform:none}100%{transform:translateX(14px)}}
@keyframes dbob{0%,100%{transform:translate(0,-6px) rotate(-3deg)}50%{transform:translate(-4px,7px) rotate(4deg)}}
@keyframes cexit{0%,91%{opacity:1;transform:none}96%,100%{opacity:0;transform:scale(1.08) translateX(24px)}}
@keyframes edge{from{stroke-dashoffset:200}to{stroke-dashoffset:0}}
@keyframes pulse{0%,100%{opacity:.35;transform:scale(.92)}50%{opacity:.95;transform:scale(1.08)}}
@keyframes flare{0%{opacity:.5;transform:rotate(0) scale(.85)}50%{opacity:1;transform:rotate(45deg) scale(1.15)}100%{opacity:.5;transform:rotate(90deg) scale(.85)}}
@keyframes glint{0%,33%{transform:translateX(-420px)}41%{transform:translateX(760px)}41.1%,69%{transform:translateX(-420px)}77%,100%{transform:translateX(760px)}}
@keyframes flash{0%,8.6%{opacity:0}9.6%{opacity:.88}13.5%,100%{opacity:0}}
@keyframes shock{from{opacity:1;transform:scale(.15)}to{opacity:0;transform:scale(4.5)}}
@keyframes slam{0%{opacity:0;transform:scale(2.5)}60%{opacity:1;transform:scale(.94)}100%{opacity:1;transform:scale(1)}}
@keyframes shine{0%,24%{transform:translateX(-160px)}34%{transform:translateX(520px)}34.1%,60%{transform:translateX(-160px)}70%,100%{transform:translateX(520px)}}
@keyframes fromleft{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:none}}
@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes strip{from{opacity:0;transform:scaleX(0)}to{opacity:1;transform:scaleX(1)}}
@keyframes ember{0%{opacity:0;transform:translate(0,0)}15%{opacity:1}100%{opacity:0;transform:translate(-22px,-60px)}}
@keyframes emberf{0%{opacity:0;transform:translate(0,0)}15%{opacity:1}100%{opacity:0;transform:translate(-50px,-110px)}}
@media (prefers-reduced-motion:reduce){.sa,.sb,.sc,.em,.emf,.gear,.gear2,.rays,.float,.sfloat,.dbob{animation:none}}
`

const PANEL = 'M62 78 H800 V258 H24 Z'
const TITLE_TEXT = '<text x="0" y="0" font-size="62" font-weight="900" letter-spacing="2">超频机核</text>'
const TITLE_AT = 'translate(58 172) skewX(-10)'

export function introSvg({ title, line }: IntroText, run: number): string {
  const greeting = escape(`${title}。${line}`)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300" viewBox="0 0 800 300">
<!-- claude-intro run ${run} -->
<defs>
<style>${STYLE}</style>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0c1428"/><stop offset=".55" stop-color="#140e22"/><stop offset="1" stop-color="#07070f"/></linearGradient>
<linearGradient id="slashFill" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff7a1a" stop-opacity="0"/><stop offset=".6" stop-color="#ff8a2a" stop-opacity=".22"/><stop offset="1" stop-color="#ffb35c" stop-opacity=".05"/></linearGradient>
<linearGradient id="titleFill" x1="0" y1="-56" x2="0" y2="8" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#ffe3bd"/><stop offset="1" stop-color="#ff9433"/></linearGradient>
<linearGradient id="shineFill" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="stripFill" x1="0" x2="1"><stop offset="0" stop-color="#ff8a2a" stop-opacity=".55"/><stop offset=".08" stop-color="#0b0f1d" stop-opacity=".85"/><stop offset="1" stop-color="#0b0f1d" stop-opacity="0"/></linearGradient>
<linearGradient id="bar" x1="0" x2="1"><stop offset="0" stop-color="#ff8a2a" stop-opacity="0"/><stop offset=".3" stop-color="#ffb35c"/><stop offset="1" stop-color="#ff7a1a" stop-opacity=".3"/></linearGradient>
<linearGradient id="fadeDown" x1="0" y1="250" x2="0" y2="298" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="#fff6dc"/><stop offset=".3" stop-color="#ffb347" stop-opacity=".85"/><stop offset="1" stop-color="#ff6a00" stop-opacity="0"/></radialGradient>
<radialGradient id="burstFill"><stop offset="0" stop-color="#ff9a3c" stop-opacity=".55"/><stop offset=".45" stop-color="#ff6a1a" stop-opacity=".18"/><stop offset="1" stop-color="#ff6a1a" stop-opacity="0"/></radialGradient>
<filter id="wind" x="-5%" y="-5%" width="110%" height="110%">
<feTurbulence type="fractalNoise" baseFrequency="0.0035 0.007" numOctaves="2" seed="7" result="noise">
<animate attributeName="baseFrequency" values="0.0035 0.007;0.0042 0.0085;0.0035 0.007" dur="7s" repeatCount="indefinite"/>
</feTurbulence>
<feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G">
<animate attributeName="scale" values="-26;26;-26" keyTimes="0;.5;1" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1" dur="3.2s" repeatCount="indefinite"/>
</feDisplacementMap>
</filter>
<filter id="rim" x="-6%" y="-6%" width="112%" height="112%">
<feMorphology in="SourceAlpha" operator="dilate" radius="7" result="grown"/>
<feGaussianBlur in="grown" stdDeviation="10" result="soft"/>
<feFlood flood-color="#ffa64d" flood-opacity=".95"/>
<feComposite in2="soft" operator="in" result="rimlight"/>
<feMerge><feMergeNode in="rimlight"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
<filter id="castShadow" x="-10%" y="-10%" width="120%" height="120%">
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 .01 0 0 0 0 .01 0 0 0 0 .04 0 0 0 .8 0"/>
<feGaussianBlur stdDeviation="24"/>
</filter>
<filter id="afterimage" x="-5%" y="-5%" width="110%" height="110%">
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 1 0 0 0 0 .55 0 0 0 0 .18 0 0 0 .9 0"/>
<feGaussianBlur stdDeviation="6"/>
</filter>
<filter id="whiteout" x="-5%" y="-5%" width="110%" height="110%"><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/></filter>
<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="30"/></filter>
<filter id="blur6" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="blur1"><feGaussianBlur stdDeviation=".7"/></filter>
<mask id="hairMask" maskUnits="userSpaceOnUse" x="-200" y="-200" width="2000" height="2200"><rect x="-200" y="-200" width="2000" height="2200" fill="#000"/><g filter="url(#soft)">${hairShape('#fff', '#000')}</g></mask>
<mask id="bodyMask" maskUnits="userSpaceOnUse" x="-200" y="-200" width="2000" height="2200"><rect x="-200" y="-200" width="2000" height="2200" fill="#fff"/><g filter="url(#soft)">${hairShape('#000', '#fff')}</g></mask>
<mask id="charFade" maskUnits="userSpaceOnUse" x="-100" y="-40" width="1000" height="360"><rect x="-100" y="-40" width="1000" height="360" fill="url(#fadeDown)"/></mask>
<clipPath id="panelClip"><path d="${PANEL}"/></clipPath>
<clipPath id="lens"><path d="M450 480 L600 420 L800 430 L915 480 L905 570 L760 590 L620 640 L500 680 L440 600 Z"/></clipPath>
<mask id="titleMask" maskUnits="userSpaceOnUse" x="0" y="0" width="800" height="300"><g transform="${TITLE_AT}" fill="#fff">${TITLE_TEXT}</g></mask>
<clipPath id="typing"><rect x="66" y="214" width="400" height="34"><animate attributeName="width" values="0;0;400" keyTimes="0;.52;1" dur="2.6s" fill="freeze"/></rect></clipPath>
<image id="char" width="1584" height="1730" preserveAspectRatio="none" href="${CHARACTER_WEBP}"/>
<image id="drone" width="300" height="300" preserveAspectRatio="none" href="${DRONE_WEBP}"/>
</defs>
<g class="panel">
<g clip-path="url(#panelClip)">
<path d="${PANEL}" fill="url(#bg)"/>
<g class="bgdrift">
<g fill="none" stroke="#ff9a3c" stroke-opacity=".13" stroke-width="2">
<g class="gear fb">${gear(118, 168, 132, 112, 20)}</g>
<g class="gear2 fb">${gear(340, 96, 70, 58, 12)}</g>
</g>
<circle class="burst fb" cx="636" cy="168" r="230" fill="url(#burstFill)"/>
<g class="rays fb" fill="#ffb35c" fill-opacity=".07">${rays(636, 168, 14, 420)}</g>
<polygon class="slash" points="120,78 300,78 180,258 0,258" fill="url(#slashFill)"/>
<polygon class="slash slash2" points="360,78 470,78 350,258 240,258" fill="url(#slashFill)"/>
<polygon class="slash slash3" points="560,78 800,78 800,120 600,258 470,258" fill="url(#slashFill)" opacity=".7"/>
</g>
<g class="speed">${SPEED_LINES}</g>
<g>${EMBERS_BACK}</g>
<g class="pin"><g class="drift"><g class="sfloat"><use href="#char" transform="translate(458 10) scale(.2)" filter="url(#castShadow)"/></g></g></g>
<path class="flash" d="${PANEL}" fill="#fff"/>
</g>
<path class="edge" d="M62 78 L24 258" stroke="#ffb35c" stroke-width="3" fill="none"/>
<rect x="40" y="76" width="760" height="3" fill="url(#bar)"/><rect x="0" y="257" width="800" height="3" fill="url(#bar)"/>
<g class="label"><text x="72" y="108" font-size="12.5" font-weight="700" letter-spacing="3" fill="#ffb05a">SECOND AWAKENING · 二次觉醒</text></g>
<g class="title">
<g transform="${TITLE_AT}" fill="#ff7a1a" opacity=".85" filter="url(#blur6)">${TITLE_TEXT}</g>
<g transform="${TITLE_AT}" fill="url(#titleFill)" stroke="#2a1206" stroke-width="3" paint-order="stroke">${TITLE_TEXT}</g>
<g mask="url(#titleMask)"><rect class="shine" x="0" y="100" width="90" height="90" fill="url(#shineFill)" transform="skewX(-20)"/></g>
</g>
<g class="sub"><text x="66" y="200" font-size="13.5" font-weight="600" letter-spacing="4" fill="#ffd9a8">CLAUDE  //  OVERCLOCK CORE</text></g>
<g class="strip"><path d="M52 214 H468 L460 248 H44 Z" fill="url(#stripFill)"/></g>
<text x="68" y="237" font-size="15.5" font-weight="600" fill="#fff6ea" clip-path="url(#typing)">${greeting}</text>
</g>
<g mask="url(#charFade)">
<g class="pin ghost"><use href="#char" transform="${CHAR}" filter="url(#afterimage)"/></g>
<g class="pin ghost ghost2"><use href="#char" transform="${CHAR}" filter="url(#afterimage)"/></g>
<g class="cexit"><g class="pin"><g class="drift"><g class="float">
<g transform="${CHAR}">
<g filter="url(#rim)">
<g mask="url(#bodyMask)"><use href="#char"/></g>
<g mask="url(#hairMask)"><use href="#char" filter="url(#wind)"/></g>
</g>
<use class="flash" href="#char" filter="url(#whiteout)"/>
<g class="screen">
<circle class="core fb" cx="630" cy="1330" r="260" fill="url(#glow)"/>
<g transform="translate(630 1330)"><g class="flare fb"><path d="M0 -210 L16 0 L0 210 L-16 0 Z M-210 0 L0 16 L210 0 L0 -16 Z" fill="#fff3d6" opacity=".9"/></g></g>
<ellipse class="tube fb" cx="1180" cy="400" rx="170" ry="44" fill="url(#glow)" transform="rotate(-35 1180 400)"/>
<g clip-path="url(#lens)"><rect class="glint" x="300" y="300" width="100" height="450" fill="url(#shineFill)" transform="skewX(-25)" opacity=".85"/></g>
</g>
</g>
</g></g></g></g>
</g>
<g class="cexit"><g class="pind"><g class="ddrift"><g class="dbob">
<g transform="${DRONE}"><use href="#drone" filter="url(#rim)"/><g class="screen"><circle class="eye fb" cx="100" cy="160" r="60" fill="url(#glow)"/></g></g>
</g></g></g></g>
<g filter="url(#blur1)">${EMBERS_FRONT}</g>
<circle class="shock fb" cx="636" cy="160" r="40" fill="none" stroke="#ffd08a" stroke-width="5"/>
<rect class="flashline" x="0" y="166" width="800" height="4" fill="#fff6e0"/>
</svg>`
}
