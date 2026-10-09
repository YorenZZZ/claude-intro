// The "second awakening" cut-in shown over the Claude desktop app's window
// while it starts. A side-scrolling-action-game style band: the character is a
// cut-out layer floating in front of it, breaking out of its top edge,
// casting a shadow onto it and moving at her own depth, the band behind her
// and the drone in front of her at theirs.
//
// Every effect that would need a filter per frame (rim light, cast shadow,
// afterimages, the impact silhouette) is baked into images by
// tools/build-layers.sh. The animation only moves, scales and fades layers,
// which WebKit hands to the GPU, so it stays smooth at any window size.
//
// Timeline, seconds after play():
//   0.00–0.24  the band opens from a slit, a flash line across it
//   0.10–0.60  slashes and speed lines rush in; the character, her afterimages
//              and shadow slam in from the right, the drone a beat later
//   0.58–0.95  white impact flash and a shockwave
//   0.72–1.05  the skill name slams down, the label and subtitle follow
//   1.35–2.60  the greeting types out on its strip
//   0.90–6.10  idle: she floats and sways above her shadow, her hair in the
//              wind, the layers drift apart (parallax), core / tube / eye
//              pulses, goggle glints, embers behind and in front of her
//   6.10–6.60  the band snaps shut and she fades toward the camera
//   6.20–6.70  the backdrop fades and the app underneath shows through
;(function (root) {
  'use strict'

  const DURATION_MS = 6700
  // One is picked at random on every start; at most 16 characters each, so
  // the greeting fits its strip.
  const LINES = [
    '系统全开，随时出击！',
    '核心已超频，今天想造点什么？',
    '机核就绪，听你指挥。',
    '扳手已上膛，Bug 准备好了吗？',
    '能量核心满载，开工！',
    '无人机已就位，目标锁定。',
    '灵感充能完毕，开始构建。',
    '代码引擎预热完成。',
    '今天也一起拆掉几个难题吧。',
    '护目镜已戴好，进入专注模式。',
    '所有模块在线，等你下令。',
    '齿轮咬合，思路已就绪。',
    '超频启动，效率拉满！',
    '把想法交给我，剩下的我来拧紧。',
    '战术目镜扫描完毕，一切正常。',
    '准备好了，今天要拆哪座山？',
    '火花已点燃，开始锻造。',
    '机核心跳稳定，随时待命。',
  ]
  const NIGHT_LINES = [
    '低功耗待命中，陪你把事情收尾。',
    '夜间模式已开启，别熬太晚。',
    '星光值班中，最后一件事交给我。',
    '核心降频运行，收尾就好。',
    '通宵不是好习惯，我陪你收尾。',
  ]
  const LAYERS = ['body', 'hair', 'shadow', 'ghost', 'white', 'drone']

  const pick = (list, random) => list[Math.min(list.length - 1, Math.floor(random() * list.length))]

  // Greets by the Mac's local time, with a random line.
  function introText(date, random = Math.random) {
    const hour = date.getHours()
    if (hour >= 23 || hour < 5) return { title: '夜深了', line: pick(NIGHT_LINES, random) }
    const title = hour < 11 ? '早上好' : hour < 13 ? '中午好' : hour < 18 ? '下午好' : '晚上好'

    return { title, line: pick(LINES, random) }
  }

  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  const escape = text => String(text).replace(/[&<>"']/g, char => ESCAPES[char] || char)

  // A fixed pseudo-random stream, so the markup is the same on every run.
  function stream(seed) {
    let state = seed
    return () => {
      state = (state * 1103515245 + 12345) % 2147483648
      return state / 2147483648
    }
  }

  const n = value => value.toFixed(1)
  const px = value => `${n(value)}px`

  // Static vector art goes in small SVGs that are painted once; every moving
  // part is an HTML box animated with transform and opacity only.
  const svg = (width, height, body, defs = '') =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" overflow="visible">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`

  function gear(outer, inner, teeth) {
    const c = outer
    const points = []
    for (let i = 0; i < teeth * 4; i++) {
      const angle = (i / (teeth * 4)) * Math.PI * 2
      const r = i % 4 === 1 || i % 4 === 2 ? outer : inner
      points.push(`${n(c + Math.cos(angle) * r)},${n(c + Math.sin(angle) * r)}`)
    }
    return svg(outer * 2, outer * 2,
      `<g fill="none" stroke="#ff9a3c" stroke-opacity=".13" stroke-width="2"><polygon points="${points.join(' ')}"/><circle cx="${c}" cy="${c}" r="${n(inner * 0.45)}"/></g>`)
  }

  // Light rays fanning out from behind her chest.
  function rays(count, length) {
    const c = length
    const fan = Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2
      const b = a + 0.12
      return `<polygon points="${c},${c} ${n(c + Math.cos(a) * length)},${n(c + Math.sin(a) * length)} ${n(c + Math.cos(b) * length)},${n(c + Math.sin(b) * length)}"/>`
    }).join('')
    return svg(length * 2, length * 2, `<g fill="#ffb35c" fill-opacity=".07">${fan}</g>`)
  }

  const random = stream(20261009)

  // Dashed streaks: an 800px dash pattern on a 1600px strip, slid one period.
  const SPEED_LINES = Array.from({ length: 16 }, (_, i) => {
    const y = 84 + i * 11 + random() * 5
    const dash = [120, 40, 220, 70][i % 4]
    const speed = ['sa', 'sb', 'sc'][i % 3]
    const colour = i % 5 === 0 ? '#fff4e0' : '#ff9a3c'
    const offset = Math.round(random() * 800)
    return `<i class="line ${speed}" style="top:${px(y)};height:${i % 4 === 2 ? 2 : 1}px;background-image:linear-gradient(to right,${colour} 0 ${dash}px,transparent ${dash}px 800px);background-position-x:${-offset}px"></i>`
  }).join('')

  function embers(count, size, area, tag) {
    return Array.from({ length: count }, (_, i) => {
      const x = area[0] + random() * area[2]
      const y = area[1] + random() * area[3]
      const r = size[0] + random() * (size[1] - size[0])
      const colour = i % 4 === 0 ? '#fff1cc' : '#ffad4d'
      return `<i class="${tag} e${i % 3} d${i % 5}" style="left:${px(x - r)};top:${px(y - r)};width:${px(r * 2)};height:${px(r * 2)};background:${colour}"></i>`
    }).join('')
  }

  const EMBERS_BACK = embers(22, [0.7, 1.9], [30, 90, 760, 170], 'em')
  const EMBERS_FRONT = embers(9, [1.8, 3.4], [430, 60, 360, 240], 'emf')

  // Layer boxes in band pixels. The character layers are the source crop at
  // 0.2 (placed at 476,-4) with 18px of baked padding; the drone is its 300px
  // source at 0.2 (placed at 724,116) with 8px. Inside the character box a
  // source crop pixel (x, y) sits at (18 + x/5, 18 + y/5).
  const CHAR_BOX = 'left:458px;top:-22px;width:352.8px;height:381.9px'
  const SHADOW_BOX = 'left:440px;top:-8px;width:352.8px;height:381.9px'
  const DRONE_BOX = 'left:716px;top:108px;width:76px;height:76px'
  const LENS = [[450, 480], [600, 420], [800, 430], [915, 480], [905, 570], [760, 590], [620, 640], [500, 680], [440, 600]]
    .map(([x, y]) => `${px(18 + x / 5)} ${px(18 + y / 5)}`).join(',')

  const PANEL = 'M62 78 H800 V258 H24 Z'
  const FONT = "font-family=\"'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC',sans-serif\""
  const TITLE_TEXT = `<text x="0" y="0" ${FONT} font-size="62" font-weight="900" letter-spacing="2">超频机核</text>`
  const TITLE_AT = 'translate(58 172) skewX(-10)'
  const TITLE_MASK = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg(800, 300, `<g transform="${TITLE_AT}" fill="#fff">${TITLE_TEXT}</g>`))}")`

  const STYLE = `
#band{position:relative;width:800px;height:300px}
#band *{position:absolute;box-sizing:border-box}
#band svg,#band img{position:static;display:block}
.fill{inset:0}
.layer{width:100%;height:100%}
i{display:block}
.panel{inset:0;transform-origin:400px 168px;animation:panel 6.6s cubic-bezier(.2,.9,.3,1) both}
.clip{inset:0;clip-path:polygon(62px 78px,800px 78px,800px 258px,24px 258px)}
.bg{left:24px;top:78px;width:776px;height:180px;background:linear-gradient(to bottom right,#0c1428,#140e22 55%,#07070f)}
.bgdrift{inset:0;animation:bgdrift 6.6s ease-out both}
.gear1{left:-14px;top:36px;animation:spin 22s linear infinite}
.gear2{left:270px;top:26px;animation:spin 14s linear infinite reverse}
.burst{left:406px;top:-62px;width:460px;height:460px;border-radius:50%;background:radial-gradient(circle closest-side,rgba(255,154,60,.55),rgba(255,106,26,.18) 45%,rgba(255,106,26,0));animation:pulse 2.6s ease-in-out .6s infinite}
.rays{left:216px;top:-252px;animation:spin 40s linear infinite}
.slash{inset:0;animation:slash .5s cubic-bezier(.2,.9,.3,1) .1s both}
.slash2{animation-delay:.16s}.slash3{animation-delay:.22s}
.speed{inset:0;animation:speed 6.6s linear both}
.line{left:-800px;width:1600px;background-size:800px 100%;background-repeat:repeat-x}
.sa{animation:dash .42s linear infinite}.sb{animation:dash .7s linear infinite}.sc{animation:dash 1.1s linear infinite}
.em,.emf{border-radius:50%;opacity:0;animation:ember 3s ease-out infinite}
.emf{animation-name:emberf;box-shadow:0 0 1.4px currentColor}
.e1{animation-duration:2.4s}.e2{animation-duration:3.6s}
.d0{animation-delay:.3s}.d1{animation-delay:.8s}.d2{animation-delay:1.3s}.d3{animation-delay:1.9s}.d4{animation-delay:2.5s}
.pin{inset:0;animation:pin .44s cubic-bezier(.15,.9,.25,1) .18s both}
.ghost{inset:0;animation:ghost .7s cubic-bezier(.15,.9,.25,1) .14s both}
.ghost2{animation-delay:.1s;animation-duration:.75s}
.pind{inset:0;animation:pind .5s cubic-bezier(.15,.9,.25,1) .3s both}
.drift{inset:0;transform-origin:50% 100%;animation:drift 6.6s ease-out both}
.float{inset:0;transform-origin:50% 100%;animation:float 3.8s ease-in-out .9s infinite}
.sfloat{inset:0;animation:sfloat 3.8s ease-in-out .9s infinite}
.ddrift{inset:0;animation:ddrift 6.6s ease-out both}
.dbob{inset:0;animation:dbob 2.6s ease-in-out .8s infinite}
.cexit{inset:0;transform-origin:50% 60%;animation:cexit 6.6s linear both}
.charfade{left:-100px;top:-40px;width:1000px;height:360px;-webkit-mask-image:linear-gradient(to bottom,#000 290px,transparent 338px);mask-image:linear-gradient(to bottom,#000 290px,transparent 338px)}
.origin{left:100px;top:40px;width:800px;height:300px}
.hair{inset:0;transform-origin:170px 208px;animation:wind 3.2s ease-in-out .9s infinite}
.flash{inset:0;opacity:0;animation:flash 6.6s linear both}
.panelflash{background:#fff}
.screen{inset:0;mix-blend-mode:screen}
.glow{border-radius:50%;background:radial-gradient(closest-side,#fff6dc,rgba(255,179,71,.85) 30%,rgba(255,106,0,0))}
.core{left:92px;top:232px;width:104px;height:104px;animation:pulse 1.7s ease-in-out .6s infinite}
.flare{left:102px;top:242px;animation:flare 3.2s linear .6s infinite}
.tube{left:220px;top:89.2px;width:68px;height:17.6px;transform:rotate(-35deg)}
.tube .glow{inset:0;animation:pulse 1.2s ease-in-out .9s infinite}
.lens{inset:0;clip-path:polygon(${LENS})}
.glint{left:78px;top:78px;width:20px;height:90px;opacity:.85;background:linear-gradient(to right,rgba(255,255,255,0),rgba(255,255,255,.95),rgba(255,255,255,0));animation:glint 6.6s linear both}
.eye{left:16px;top:28px;width:24px;height:24px;animation:pulse 1.4s ease-in-out .7s infinite}
.edge{inset:0}
.edge path{stroke-dasharray:200;animation:edge .35s ease-out .3s both}
.bar{height:3px;background:linear-gradient(to right,rgba(255,138,42,0),#ffb35c 30%,rgba(255,122,26,.3))}
.label{inset:0;animation:fromleft .35s ease-out .95s both}
.title{inset:0;transform-origin:52px 152px;animation:slam .36s cubic-bezier(.2,1.3,.4,1) .72s both}
.shinemask{inset:0;-webkit-mask:${TITLE_MASK} 0 0/800px 300px no-repeat;mask:${TITLE_MASK} 0 0/800px 300px no-repeat}
.shine{left:0;top:100px;width:90px;height:90px;background:linear-gradient(to right,rgba(255,255,255,0),rgba(255,255,255,.95),rgba(255,255,255,0));animation:shine 6.6s linear both}
.sub{inset:0;animation:rise .35s ease-out 1.05s both}
.strip{inset:0;transform-origin:44px 231px;animation:strip .3s ease-out 1.2s both}
.typing{left:66px;top:214px;width:400px;height:34px;overflow:hidden;animation:reveal 1.25s linear 1.35s both}
.typing>.counter{left:-66px;top:-214px;width:800px;height:300px;animation:counter 1.25s linear 1.35s both}
.shock{left:593.5px;top:117.5px;width:85px;height:85px;border:5px solid #ffd08a;border-radius:50%;opacity:0;animation:shock .5s ease-out .58s both}
.flashline{left:0;top:166px;width:800px;height:4px;background:#fff6e0;transform-origin:400px 2px;animation:flashline 6.6s linear both}
@keyframes panel{0%{transform:scaleY(.015)}3.6%{transform:scaleY(1)}92.4%{transform:scaleY(1);opacity:1}98.5%{transform:scaleY(.015);opacity:1}100%{transform:scaleY(.015);opacity:0}}
@keyframes flashline{0%{opacity:1;transform:scaleX(.2)}3%{opacity:1;transform:scaleX(1)}6%,92%{opacity:0;transform:scaleX(1)}96%{opacity:1}100%{opacity:0}}
@keyframes slash{from{opacity:0;transform:translateX(180px)}to{opacity:1;transform:none}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes bgdrift{from{transform:translateX(10px)}to{transform:translateX(-16px)}}
@keyframes speed{0%{opacity:0}3%,14%{opacity:.95}26%,100%{opacity:.3}}
@keyframes dash{from{transform:translateX(0)}to{transform:translateX(800px)}}
@keyframes pin{0%{opacity:0;transform:translateX(380px) skewX(-14deg)}70%{opacity:1;transform:translateX(-14px) skewX(3deg)}100%{opacity:1;transform:none}}
@keyframes ghost{0%{opacity:0;transform:translateX(380px) skewX(-14deg)}35%{opacity:.55}70%{opacity:.35;transform:translateX(30px) skewX(0)}100%{opacity:0;transform:translateX(60px)}}
@keyframes pind{0%{opacity:0;transform:translateX(460px)}70%{opacity:1;transform:translateX(-18px)}100%{opacity:1;transform:none}}
@keyframes drift{0%,10%{transform:none}100%{transform:translateX(7px) scale(1.03)}}
@keyframes float{0%,100%{transform:translateY(0) rotate(-.35deg)}50%{transform:translateY(-6px) rotate(.35deg)}}
@keyframes sfloat{0%,100%{opacity:.95;transform:none}50%{opacity:.62;transform:translate(-4px,4px)}}
@keyframes ddrift{0%,12%{transform:none}100%{transform:translateX(14px)}}
@keyframes dbob{0%,100%{transform:translate(0,-6px) rotate(-3deg)}50%{transform:translate(-4px,7px) rotate(4deg)}}
@keyframes cexit{0%,91%{opacity:1;transform:none}96%,100%{opacity:0;transform:scale(1.08) translateX(24px)}}
@keyframes wind{0%,100%{transform:rotate(-.7deg) skewX(.4deg)}50%{transform:rotate(.7deg) skewX(-.4deg)}}
@keyframes edge{from{stroke-dashoffset:200}to{stroke-dashoffset:0}}
@keyframes pulse{0%,100%{opacity:.35;transform:scale(.92)}50%{opacity:.95;transform:scale(1.08)}}
@keyframes flare{0%{opacity:.5;transform:rotate(0) scale(.85)}50%{opacity:1;transform:rotate(45deg) scale(1.15)}100%{opacity:.5;transform:rotate(90deg) scale(.85)}}
@keyframes glint{0%,33%{transform:translateX(-84px) skewX(-25deg)}41%{transform:translateX(152px) skewX(-25deg)}41.1%,69%{transform:translateX(-84px) skewX(-25deg)}77%,100%{transform:translateX(152px) skewX(-25deg)}}
@keyframes flash{0%,8.6%{opacity:0}9.6%{opacity:.88}13.5%,100%{opacity:0}}
@keyframes shock{from{opacity:1;transform:scale(.15)}to{opacity:0;transform:scale(4.5)}}
@keyframes slam{0%{opacity:0;transform:scale(2.5)}60%{opacity:1;transform:scale(.94)}100%{opacity:1;transform:scale(1)}}
@keyframes shine{0%,24%{transform:translateX(-160px) skewX(-20deg)}34%{transform:translateX(520px) skewX(-20deg)}34.1%,60%{transform:translateX(-160px) skewX(-20deg)}70%,100%{transform:translateX(520px) skewX(-20deg)}}
@keyframes fromleft{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:none}}
@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes strip{from{opacity:0;transform:scaleX(0)}to{opacity:1;transform:scaleX(1)}}
@keyframes reveal{from{transform:translateX(-400px)}to{transform:none}}
@keyframes counter{from{transform:translateX(400px)}to{transform:none}}
@keyframes ember{0%{opacity:0;transform:translate(0,0)}15%{opacity:1}100%{opacity:0;transform:translate(-22px,-60px)}}
@keyframes emberf{0%{opacity:0;transform:translate(0,0)}15%{opacity:1}100%{opacity:0;transform:translate(-50px,-110px)}}
@media (prefers-reduced-motion:reduce){.sa,.sb,.sc,.em,.emf,.gear1,.gear2,.rays,.float,.sfloat,.dbob,.hair{animation:none}}
`

  const SLASH_FILL = '<linearGradient id="slashFill" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff7a1a" stop-opacity="0"/><stop offset=".6" stop-color="#ff8a2a" stop-opacity=".22"/><stop offset="1" stop-color="#ffb35c" stop-opacity=".05"/></linearGradient>'
  const slash = (points, extra = '') => svg(800, 300, `<polygon points="${points}" fill="url(#slashFill)"${extra}/>`, SLASH_FILL)

  const TITLE_DEFS = '<linearGradient id="titleFill" x1="0" y1="-56" x2="0" y2="8" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#ffe3bd"/><stop offset="1" stop-color="#ff9433"/></linearGradient><filter id="blur6" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="6"/></filter>'
  const STRIP_DEFS = '<linearGradient id="stripFill" x1="0" x2="1"><stop offset="0" stop-color="#ff8a2a" stop-opacity=".55"/><stop offset=".08" stop-color="#0b0f1d" stop-opacity=".85"/><stop offset="1" stop-color="#0b0f1d" stop-opacity="0"/></linearGradient>'
  const FLARE = svg(84, 84, '<path d="M42 0 L45.2 42 L42 84 L38.8 42 Z M0 42 L42 45.2 L84 42 L42 38.8 Z" fill="#fff3d6" opacity=".9"/>')

  function introMarkup({ title, line }) {
    const greeting = escape(`${title}。${line}`)
    const img = name => `<img class="layer" src="layers/${name}.webp" alt="">`

    return `<style>${STYLE}</style>
<div id="band">
<div class="panel">
<div class="clip">
<div class="bg"></div>
<div class="bgdrift">
<div class="gear1">${gear(132, 112, 20)}</div>
<div class="gear2">${gear(70, 58, 12)}</div>
<div class="burst"></div>
<div class="rays">${rays(14, 420)}</div>
<div class="slash">${slash('120,78 300,78 180,258 0,258')}</div>
<div class="slash slash2">${slash('360,78 470,78 350,258 240,258')}</div>
<div class="slash slash3">${slash('560,78 800,78 800,120 600,258 470,258', ' opacity=".7"')}</div>
</div>
<div class="speed">${SPEED_LINES}</div>
<div class="fill">${EMBERS_BACK}</div>
<div style="${SHADOW_BOX}"><div class="pin"><div class="drift"><div class="sfloat">${img('shadow')}</div></div></div></div>
<div class="flash panelflash"></div>
</div>
<div class="edge">${svg(800, 300, '<path d="M62 78 L24 258" stroke="#ffb35c" stroke-width="3" fill="none"/>')}</div>
<i class="bar" style="left:40px;top:76px;width:760px"></i><i class="bar" style="left:0;top:257px;width:800px"></i>
<div class="label">${svg(800, 300, `<text x="72" y="108" ${FONT} font-size="12.5" font-weight="700" letter-spacing="3" fill="#ffb05a">SECOND AWAKENING · 二次觉醒</text>`)}</div>
<div class="title">
${svg(800, 300, `<g transform="${TITLE_AT}" fill="#ff7a1a" opacity=".85" filter="url(#blur6)">${TITLE_TEXT}</g><g transform="${TITLE_AT}" fill="url(#titleFill)" stroke="#2a1206" stroke-width="3" paint-order="stroke">${TITLE_TEXT}</g>`, TITLE_DEFS)}
<div class="shinemask"><i class="shine"></i></div>
</div>
<div class="sub">${svg(800, 300, `<text x="66" y="200" ${FONT} font-size="13.5" font-weight="600" letter-spacing="4" fill="#ffd9a8" xml:space="preserve">CLAUDE  //  OVERCLOCK CORE</text>`)}</div>
<div class="strip">${svg(800, 300, '<path d="M52 214 H468 L460 248 H44 Z" fill="url(#stripFill)"/>', STRIP_DEFS)}</div>
<div class="typing"><div class="counter">${svg(800, 300, `<text x="68" y="237" ${FONT} font-size="15.5" font-weight="600" fill="#fff6ea">${greeting}</text>`)}</div></div>
</div>
<div class="charfade"><div class="origin">
<div style="${CHAR_BOX}"><div class="ghost">${img('ghost')}</div></div>
<div style="${CHAR_BOX}"><div class="ghost ghost2">${img('ghost')}</div></div>
<div style="${CHAR_BOX}"><div class="cexit"><div class="pin"><div class="drift"><div class="float">
${img('body')}
<div class="hair">${img('hair')}</div>
<div class="flash">${img('white')}</div>
<div class="screen">
<i class="glow core"></i>
<div class="flare">${FLARE}</div>
<div class="tube"><i class="glow"></i></div>
<div class="lens"><i class="glint"></i></div>
</div>
</div></div></div></div></div>
</div></div>
<div style="${DRONE_BOX}"><div class="cexit"><div class="pind"><div class="ddrift"><div class="dbob">
${img('drone')}
<div class="screen"><i class="glow eye"></i></div>
</div></div></div></div></div>
<div class="fill">${EMBERS_FRONT}</div>
<i class="shock"></i>
<i class="flashline"></i>
</div>`
  }

  // Messages to the native app: prepared, ready (the band is on screen),
  // stats, done, skip.
  function post(message) {
    const handler = root.webkit && root.webkit.messageHandlers && root.webkit.messageHandlers.intro
    if (handler) handler.postMessage(message)
  }

  // Frame pacing for the log: how often a frame took longer than ~1.5 vsyncs.
  function measureFrames(span) {
    const gaps = []
    let last = 0
    const began = root.performance.now()
    const tick = now => {
      if (last) gaps.push(now - last)
      last = now
      if (now - began < span) return root.requestAnimationFrame(tick)
      gaps.sort((a, b) => a - b)
      const pick = q => gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * q))].toFixed(1)
      post(`stats: frames=${gaps.length} fps=${(gaps.length / ((now - began) / 1000)).toFixed(1)} p50=${pick(0.5)}ms p95=${pick(0.95)}ms max=${pick(1)}ms over25ms=${gaps.filter(g => g > 25).length}`)
    }
    root.requestAnimationFrame(tick)
  }

  // The band is 800x300 design pixels, zoomed to fit the window, with room
  // for the character rising above it.
  function fit(document) {
    const band = document.getElementById('band')
    const scale = Math.min(root.innerWidth * 0.9, root.innerHeight * 1.7, 1500) / 800
    band.style.zoom = String(scale)
  }

  let prepared = null

  // Decodes every layer up front, so nothing arrives after the band opens.
  function prepare() {
    prepared = prepared || Promise.all(LAYERS.map(name => {
      const image = new root.Image()
      image.src = `layers/${name}.webp`
      return image.decode()
    })).then(() => post('prepared'))
    return prepared
  }

  async function play(document) {
    await prepare()
    const stage = document.getElementById('stage')
    stage.innerHTML = introMarkup(introText(new Date()))
    fit(document)
    root.addEventListener('resize', () => fit(document))
    document.body.classList.add('playing')
    document.addEventListener('mousedown', () => post('skip'), { once: true })
    measureFrames(DURATION_MS - 200)
    root.setTimeout(() => post('done'), DURATION_MS)
    post('ready')
  }

  const api = { DURATION_MS, LINES, NIGHT_LINES, introText, introMarkup, prepare, play }
  if (typeof module === 'object' && module.exports) module.exports = api
  else root.ClaudeIntro = api
})(typeof window === 'undefined' ? globalThis : window)
