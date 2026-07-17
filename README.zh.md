# 🌸 Pollinations AI 插件 - OpenCode版 (v6.4.9)

## ✨ v6.4.9 新功能

- 🎯 **任务与游戏化**：`polli_quests` + `/poll quests`。使用本插件可**追溯**完成多项任务。
- 🆓 **免费工具（无需密钥）** — 适用于**任何** OpenCode 模型：
  - `gen_edit_image_free` — 生成**与**编辑（约 20/天）
  - `gen_video_free` — 文本→视频（约 5/天）
  - `object_remover` / `image_upscaler` / `image_enhancer` — 免费图像处理
  - `remove_background` — 免费 AI 抠图（rmbg / bgeraser）
- 🔐 **一键登录**：`/poll login` + `polli_login`。仍可用 `/poll connect sk_...`。
- 🧊 **完整模型目录**：text、image、video、audio、**3D**、**embeddings**、realtime。
- 🧪 **CI + 打包**：Node ≥ 18，CLI `npx opencode-pollinations-plugin`，单元 + i18n 测试。
- 🌍 **6 种语言**：en、fr、es、de、it、zh — 引导与命令对齐。


<div align="center">
  <img src="https://avatars.githubusercontent.com/u/88394740?s=400&v=4" alt="Pollinations.ai Logo" width="180">
  <h3>连接 OpenCode 终端与 Pollinations.ai 生态的终极桥梁</h3>
  <p><em>直接通过你的本地终端，随时随地访问连续的免费AI基础模型，或在我们慷慨的 <b>每小时免费额度 (Hourly Free Tiers)</b> 支持下，使用顶级企业大模型。</em></p>
</div>

<div align="center">

[![NPM Version](https://img.shields.io/npm/v/opencode-pollinations-plugin?color=blue&style=for-the-badge)](https://www.npmjs.com/package/opencode-pollinations-plugin)
[![Downloads](https://img.shields.io/npm/dt/opencode-pollinations-plugin?color=success&style=for-the-badge)](https://www.npmjs.com/package/opencode-pollinations-plugin)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](LICENSE)

</div>

---

## 📖 理念: 创作者的开源AI平台

> **"没有商业壁垒，没有隐藏的障碍 — 只有优秀的工具和友善的社区。"**

**Pollinations.ai** 是一个由社区构建的开源AI平台。我们为图像、文本、音频和视频的生成功能提供直观、统一的 API。

- 🌍 **完全透明**: 我们的底层代码、开发路线图(Roadmap)以致社区探讨全部对外公开。
- ⚖️ **公平的经济模式**: 全平台使用统一计量单位 (**Pollen 🌻**) 代替繁琐的点券。透明定价，永不强制锁定平台 (No Vendor Lock-in)。

---

## ✨ V6.4 新篇章

- ⏱️ **小时级额度刷新**: 告别漫长的每日限额等待！现有的开发者等级现在将在 **每个整点** (`:00`) 清零并重新下放属于你的花粉(Pollen)。这确保您的代码生成和创意测试不被中断！
- ⚡ **100% 动态云端引擎**: 在 V6.2 中，代理助手如今能够自主向 Pollinations API 前台发送查询请求，自动读取并注入全网最新的 AI 模型表 (`[💎 Paid]`, `[🌿 Free]`) 、动态最高限额与实时期望消费数据，硬编码的时代宣告结束。
- 🛡️ **严格的安全拦截机制**: 从底层重构防止越界查库漏洞，对任何涉及资金变动的非法 URL 和参数结构实施深度封堵。
- 🔍 **突破性的搜索工具**: `polli_web_search` 搜索模型现在已完美无缝结合诸如 Google Gemini Fast、Perplexity 此类带有自主实时搜索的强劲助手。

---

## 🧰 内置神兵利器

连接你的个人 API 密钥 (Key) 之后，即可赋予 OpenCode Agent 完全访问我们在后台准备的多媒体大核心算力工具的权限：

### 💎 高级生成网络集群 (ENTER ONLY - 需提供API密钥)
- 🎨 `polli_gen_image` : 目前世界最知名的视觉核心 (`Flux`, `Sana`, `Midjourney`, 等等)。
- 🎬 `polli_gen_video` : 强大的 文生视频 (T2V) 与 图生视频 (I2V) 引擎 (`Wan`, `Veo`, `LTX`, `Reveal`)。
- 🔊 `polli_gen_audio` & `polli_gen_music` : 拟真度极高的自然人声合成 (ElevenLabs, OpenAI TTS) 和 智能背景音乐编曲。
- 🎙️ `polli_stt` : 媲美专家的 AI 语言文字转化抓取轨道 (基于 Whisper V3)。
- 🌐 `polli_web_search` : 面向全球互联与深度资料调研辅助模型 (`gemini-search`, `perplexity...`)。

### 🧰 免费的创作者辅助系统 (永远可以使用)
- ✂️ `remove_background` : 超快原生 AI 自动抠图功能。
- 🛠️ 配合 `gen_qrcode`二维码、`extract_frames`分帧,、以及开发上传工具 `file_to_url` 等实用功能提升效率。

### 💻 本地终端命令集列表
你随时可以在聊天的终端呼叫代号 **`/poll`**（推荐）或 **`/pollinations`**:
- `/poll help` : 打开交互命令大全列表。
- `/poll connect` : "自带密钥 (BYOK)" 的交互导入接口设定。
- `/poll usage full` : 个人资料控制台看板，可观测消耗剩余实时免费流量和预存花粉余额。
- `/poll config` : 更偏向于系统的参数修正比如语言、防爆额度的调节。
- `/poll models` : 即刻一览所有状态是在线的支持库模型。
- `/poll pricing` : 核对全网 Pollen (期望折线花费) 平均列表价格。
- `/poll fallback` : 定义在免费服务崩溃时你的紧急底层大模型通道。
- `/poll infos` : 一篇给新老用户阅读关于等级福利详解和基础社群公约的长文介绍。

---

## 🛡️ "Cost Guard" 警卫系统 ＆ "安全降落路线" (Safety Net)

我们非常在乎您的私人资产和宝贵开发工序，因此设置了这些保护带确保您高枕无忧:

- 🛟 **安全降落路线 (Safety Net)**: 如果你在写程序的深夜用光了每小时的高额度配给，此时你的所有 Premium 调度命令就会触发拦截，并安静快速的回退降落至 免费通用型大模型 (Free fallback models)。*拒绝让你因为 429 Error 失联。*
- 🚦 **防爆预警 (Cost Guard)**: OpenCode的自动助手有时会擅作主张消耗运算生成特别复杂的超长视频，但在这里不存在被割韭菜。所有超出警戒阈值的资源任务均会被打断并冻结挂起。系统弹出安全质询通道（要求您必须亲自在公屏回复执行确认）它才能继续扣花粉工作。您可以完全把控每一笔帐目。

---

## 🐝 快速掌握 Pollens 与 "开发者等级 (Free Tiers)"

在过去，Pollinations 主要通过广告平台养活大量公益节点。但今天，超大体量模型 (Claude 3.5 Sonnet, Wan Video 甚至 Flux Pro等) 消耗服务器资源可谓燃烧。所以需要加入被称之为 **Enter Universe** 的世界获取凭证通行（这就需要有 API 密钥了）。

**别急，你不一定非要绑用那愚蠢或麻烦的银行卡支付验证！**

**Pollen 🌻** (花粉) 是一种标准化凭证虚拟计费代币 (换算: 1$ 余额约 ≈ 1个 Pollen)。无论你是何许人，只要拥有一个完全免费申请通过的API KEY 并载入即可享受 **每个小时(Hourly)** 下放的补给白嫖指标！你的产出贡献越高（即下面列表中所达到的等级Tier阶段）每小时收复的资源越多：

| Tier (称号) | 每小时获取补贴量 ⏱️ | 无限循环参考值* | 达成条件 |
| :--- | :--- | :--- | :--- |
| 🍄 **Spore (孢子)** | **0.01 Pollen / 小时** | 每天约 ~0.24 | 自动安全审核激活系统 |
| 🌱 **Seed (树种)** | **0.15 Pollen / 小时** | 每天约 ~3.6 | GitHub 活跃开发成员 (总分达 8+) |
| 🌸 **Flower (花朵)** | **0.40 Pollen / 小时** | 每天约 ~9.6 | **至少有完成并首发过一款应用在市场！** |
| 🍯 **Nectar (花蜜)** | **0.80 Pollen / 小时** | 每天约 ~19.2 | 🔮 等待解锁中... |

_*所列出每天近似最大总额建立在前置满消(~24h × hourly rate)为理论上限。真实的花粉量都会准时在零点过的一分钟 (XX:00) 统一灌满池子里。_

> 🎁 **请前往 [Pollinations.ai](https://enter.pollinations.ai/authorize?redirect_url=https://github.com/fkom13/opencode-pollinations-plugin) 搞定这把无敌的神庙钥匙 (BYOK) 以最大化您的 OpenCode 体验!**

**具体消费工作流循环顺序：**
1. 优先使用每小时的零花钱基础等级 (例如你是Flower,那么前 0.40 🌻 的消费全由这块报销)。
2. 报销券花完了?  系统立刻切为不用钱性能较慢一点点的免费通道为你打工。
3. 倘若自己还买了增值储值 (Wallet), 然后遇到付费应用才使用 Wallet里真正的花粉。
4. Boom! 💥 下个小时开始了, 所有的额度补给立刻拉到全满状态。爽！

---

## 🌍 首发全球化本地支持 (i18n)

Pollinations for OpenCode 已提供母语原生语言支持，沟通无缝顺畅:
- 插件主程序的内部控制模块界面、消息横幅提醒(Toasts)、命令参数界面与工具反馈都已为您贴心地支持 **英语**、**法语**、**西班牙语**、**德语**、**意大利语** 和 **中文**。
- 可随时使用一键魔法口令 `/poll config lang <en|fr|es|de|it|zh>`，终端界面便能瞬息转换语系状态。

---

## 🚀 起步向导指引 (Onboarding)

### 🐧 1. 跨平台系统预案配置 (NPM)
全系终端系统通吃 **完全支持跨平台架构兼容** (涵盖 Windows, macOS, 与 Linux)，并有探针随时检测 OpenCode 服务所在网络端口。

1. 进入系统原生后台(使用Node的包引擎管理)，部署于公共环境变量内:
   ```bash
   npm install -g opencode-pollinations-plugin
   ```
2. 调用并自主匹配配置文件挂载入全局系统:
   ```bash
   npx opencode-pollinations-plugin
   ```
   *(有强迫症也可以自己去写在本地隐藏的存放文本文件 `~/.config/opencode/opencode.json` 里也可以的)*

### 🔑 2. 入场初始化引导界面
部署好了以后当你看向 OpenCode 会话栏，只需要这局纯命令行告诉AI：
```bash
/poll connect
```
然后它会开启极简化的全自问自答应答体系帮你配置上文你拿到的 Api KEY！*(如果你看到那个选大模型那个拉下的 UI图形组件还是黑的就必须重新载入重启启动一边 OpenCode)*

---

## 🔗 相关联结区域

- **去获取一枚能让你上天的 Pollen 秘钥吧**: [pollinations.ai](https://pollinations.ai)
- **在这里大喊救命或炫耀作品 (官方Discord Discord)**: [欢迎加入家庭！](https://discord.gg/pollinations-ai-885844321461485618)
- **查看目前 OpenCode 这片生机勃勃的宇宙生态**: [opencode.ai](https://opencode.ai/docs/ecosystem#plugins)

## 📜 源码条例与规范 (License)

全面遵循 MIT 开源与分享协议. 代码源于热血的大将 [fkom13](https://github.com/fkom13) & The Pollinations Community. 一起努力造访未来吧！
