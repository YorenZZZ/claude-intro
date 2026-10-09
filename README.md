# claude-intro · Claude Code 二次觉醒入场动画

每次开启 Claude Code 会话时，在输入框上方先演一段横版动作网游「二次觉醒」式的立绘演出，再弹出欢迎语，约 6.7 秒后自动收起，回到正常界面。

![入场动画预览](docs/preview.webp)

> 静态截图：[docs/preview-still.jpg](docs/preview-still.jpg)

## 演出内容

- **开场**：光缝展开、放射光芒、速度线扫过斜切面板
- **登场**：机械师立绘拖着橙色残影冲入，无人机随后跟进；白闪 + 冲击波
- **标题**：「超频机核」大字砸下，`SECOND AWAKENING · 二次觉醒` 与副标题依次出现，欢迎语逐字打出
- **3D 浮层**：人物是抠出的独立图层，头发和扳手冲出面板上沿，轮廓带光边，身后投影落在面板上；背景、人物、无人机三层以不同速度视差移动
- **立绘微动**（像动态壁纸）：人物上下浮动、轻微摇摆，投影随之变化；头发随风摆动；胸口核心、扳手能量管、无人机眼睛明暗呼吸；护目镜扫过高光；前后两层火星飘散
- **收场**：面板收成一道光缝，人物同时淡出
- 欢迎语按设定的时区区分早上好 / 中午好 / 下午好 / 晚上好 / 夜深了

在终端里运行的 Claude Code 不能显示 SVG，会改播一段简短的字符动画。

## 安装

需要支持函数钩子插件的 Claude Code（在 2.1.285 – 2.1.293 上测试；该插件接口仍处于早期阶段，后续版本可能变化）。完整的立绘演出在 Claude 桌面 app 的 Code 标签页里显示。

在终端的 Claude Code 会话里输入：

```
/plugin install claude-intro --marketplace YorenZZZ/claude-intro
```

按 `y` 添加插件市场，作用域选 user。之后桌面 app 里新开的本地会话也会加载它。

也可以直接用命令行安装：

```bash
claude plugin marketplace add YorenZZZ/claude-intro
```

```bash
claude plugin install claude-intro@claude-intro
```

## 配置

| 选项 | 默认 | 说明 |
| --- | --- | --- |
| `utcOffset` | `8` | 判断问候时段所用的时区（UTC 偏移小时，北京时间为 8） |

在 `/config` 里修改，或者：

```bash
echo '{"utcOffset":"8"}' | claude plugin configure claude-intro@claude-intro --values-stdin
```

## 使用

- 新开会话时自动播放
- `/claude-intro` 随时重播

卸载：

```bash
claude plugin uninstall claude-intro@claude-intro
```

## 换成你自己的立绘

`tools/build-portrait.sh` 用 macOS Vision 主体抠图，把一张立绘重新生成为内嵌图层（需要 macOS 14+、Xcode Command Line Tools、ImageMagick 与 `cwebp`）：

```bash
tools/build-portrait.sh 你的立绘.png +0+220 300x300+1250+830
```

参数依次为：人物图层（1584×1730）在抠图结果里的偏移、无人机在原图里的裁切框。`hooks/intro-svg.ts` 里的光效位置、头发遮罩和护目镜高光是按当前立绘的像素坐标摆放的，换图后需要一起调整。

## 开发

```bash
claude plugin validate .
```

```bash
claude plugin test .
```

| 文件 | 作用 |
| --- | --- |
| `hooks/register.tsx` | 会话启动时开始播放、`/claude-intro` 命令、在输入框上方绘制 |
| `hooks/intro-svg.ts` | 整段演出：一张由 CSS / SMIL 驱动的 SVG |
| `hooks/intro-client.tsx` | 以实际显示的时刻计时，播完收起；终端字符动画 |
| `hooks/portrait.ts` | 内嵌的人物与无人机图层（带透明的 WebP） |
| `tools/` | 抠图与重新生成图层的工具 |

## 素材与声明

- 立绘是原创角色，由 AI 生成（豆包 Seedream 5.0，经火山引擎调用），再用 macOS Vision 抠图；不包含任何游戏的官方美术。
- 演出风格是向横版动作网游（如《地下城与勇士》）觉醒技能立绘演出致敬的同人作品，与 Nexon、Neople、Anthropic 均无关联。

## License

[MIT](LICENSE)

---

**English:** A Claude Code plugin that plays a side-scrolling-action-MMO style "second awakening" cut-in above the prompt when a session starts: an original AI-generated mechanic character floats as a cut-out layer in front of a slashed panel, with parallax, rim light, cast shadow, wind in her hair and pulsing glows, then greets you and folds away after about 6.7 seconds. Install with `/plugin install claude-intro --marketplace YorenZZZ/claude-intro`; replay with `/claude-intro`. The full cut-in renders in the Claude desktop app's Code tab; terminal sessions get a short text animation.
