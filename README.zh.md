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

- 🛟 **安全降落路线 (Safety Net)**: 如果你在写程序的深夜用光了 Quest/Paid 余额，此时你的所有 Premium 调度命令就会触发拦截，并安静快速的回退降落至 免费通用型大模型 (Free fallback models)。*拒绝让你因为 429 Error 失联。*
- 🚦 **防爆预警 (Cost Guard)**: OpenCode的自动助手有时会擅作主张消耗运算生成特别复杂的超长视频，但在这里不存在被割韭菜。所有超出警戒阈值的资源任务均会被打断并冻结挂起。系统弹出安全质询通道（要求您必须亲自在公屏回复执行确认）它才能继续扣花粉工作。您可以完全把控每一笔帐目。

---

## 🐝 快速了解 Quest Pollen 与 Paid Pollen

Pollinations 的花粉 (Pollen) 分为两个账目：

- **🎁 Quest Pollen（任务花粉）** — 通过完成**任务**免费获得。在常规模型上由服务器优先消耗。
- **💎 Paid Pollen（付费花粉）** — 通过购买获得（信用卡）。当 Quest 不足或用于 `paid_only` 模型时使用。

> ⚠️ 插件无法在服务端读取这一分配；它在本地估算 Quest/Paid，并从 `/account/usage` 读取真实的分配来源 (`meter_source`)。

### 计费模式 (v6.5)

| 模式 | 行为 |
| :--- | :--- |
| `quest` (QUEST_PREFERRED，**默认**) | Quest 优先，允许 Paid 回退（服务器默认）。当两者看起来都已耗尽时，回退到 Free Universe。 |
| `quest_only` (QUEST_ELIGIBLE_ONLY) | 在本地阻止 `paid_only` 模型；只发送符合 Quest 条件的调用。**尽力而为 (Best-effort)** — 在竞态下仍可能产生 Paid 扣费。 |
| `paid` (PAID_ALLOWED) | 允许 Paid，`paid_only` 需经过 Cost Guard 审批。当钱包余额不足时回退到 Free。 |
| `manual` | 无自动策略 — 完全手动控制。 |

通过 `/poll mode <mode>` 或 `/poll config mode <mode>` 更改。

> 🎯 **通过完成任务赚取免费 Pollen！** 只要使用本插件即可追溯完成多项任务。运行 `/poll quests` 查看你可以领取的奖励。

> 🎁 **前往 [Pollinations](https://enter.pollinations.ai) 获取你的免费个人密钥 (BYOK)，为 OpenCode 加速！**

**工作原理：**
1. 在常规模型上，你的 Quest Pollen 会被优先消耗。
2. 💎 仅限付费的模型始终使用已购买的 Pollen。
3. 当两个余额都已耗尽时，安全网会优雅地切换到免费的备用模型。

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
