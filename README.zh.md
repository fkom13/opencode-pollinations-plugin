# 🌸 Pollinations AI 插件 - OpenCode版 (v6.5.0)

<div align="center">
  <img src="https://avatars.githubusercontent.com/u/88394740?s=400&v=4" alt="Pollinations.ai Logo" width="180">
  <h3>连接 OpenCode 终端与 Pollinations.ai 生态的终极桥梁</h3>
  <p><em>直接通过你的本地终端，随时随地访问连续的免费AI基础模型，或在我们的 <b>Quest 与付费 Pollen</b> 体系支持下，使用顶级企业大模型。</em></p>
</div>

<div align="center">

[![NPM Version](https://img.shields.io/npm/v/opencode-pollinations-plugin?color=blue&style=for-the-badge)](https://www.npmjs.com/package/opencode-pollinations-plugin)
[![Downloads](https://img.shields.io/npm/dt/opencode-pollinations-plugin?color=success&style=for-the-badge)](https://www.npmjs.com/package/opencode-pollinations-plugin)
[![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](LICENSE)

</div>

---

## 📖 理念: 创作者的开源AI平台

> **"没有商业壁垒，没有隐藏的障碍 — 只有优秀的工具和友善的社区。"**

**Pollinations.ai** 是一个由社区构建的开源AI平台。我们为图像、文本、音频、视频和 3D 的生成功能提供直观、统一的 API。

- 🌍 **完全透明**: 我们的底层代码、开发路线图(Roadmap)以致社区探讨全部对外公开。
- ⚖️ **公平的经济模式**: 全平台使用统一计量单位 (**Pollen 🌻**) 代替繁琐的点券。透明定价，永不强制锁定平台 (No Vendor Lock-in)。

---

## ✨ v6.5.0 新功能

- 🧊 **3D 生成 (`polli_gen_3d`)**：支持生成标准 `.glb` 3D 模型（`trellis-2`, `hyper3d-rodin`），内置 Cost Guard 预警与缓存恢复。
- 🛡️ **彻底杜绝重复扣费**：对话重试严格限制为 HTTP 429；超时和网络中断绝不会重新提交付费请求。
- 🧠 **纯净思考流规范化**：自动过滤 DeepSeek、Kimi 和 Qwen 的思维链标签，拒绝思维内容污染对话区。
- 💰 **透明的 Quest 与 Paid 计费体系**：全新计费模式（`quest`, `quest_only`, `paid`, `manual`）以及绝对 Pollen 阈值下限防护。
- 📦 **Artifact Core（Magic Bytes 核心）**：基于真实文件魔数（JPEG, PNG, GLB, MP4, MP3, WebM）校验保存，确保磁盘后缀名绝对正确。
- ⏱️ **可配置超时层级**：支持单次调用、单模型及按功能大类配置超时（`/poll config timeouts.*`）。
- 🎯 **任务体系与一键登录**：追溯任务完成状态（`/poll quests`）以及浏览器一键授权登录（`/poll login`）。
- 🆓 **6 大创作者免费工具（无需密钥）**：`gen_edit_image_free`、`gen_video_free`、`object_remover`、`image_upscaler`、`image_enhancer`、`remove_background`。

---

## 🧰 内置工具与命令

连接你的个人 API 密钥 (Key) 之后，即可赋予 OpenCode Agent 完全访问我们在后台准备的多媒体大核心算力工具的权限：

### 💎 高级生成网络集群 (ENTER ONLY - 需提供API密钥)
- 🎨 `polli_gen_image` : 目前世界最知名的视觉核心 (`Flux`, `Sana`, `Midjourney`, 等等)。
- 🎬 `polli_gen_video` : 强大的 文生视频 (T2V) 与 图生视频 (I2V) 引擎 (`Wan`, `Veo`, `LTX`, `Reveal`)。
- 🧊 `polli_gen_3d` : 高质量 3D 资产生成工具 (`trellis-2`, `hyper3d-rodin`)，输出 GLB 格式。
- 🔊 `polli_gen_audio` & `polli_gen_music` : 拟真度极高的自然人声合成 (ElevenLabs, OpenAI TTS) 和 智能背景音乐编曲。
- 🎙️ `polli_stt` : 媲美专家的 AI 语言文字转化抓取轨道 (基于 Whisper V3)。
- 🌐 `polli_web_search` : 面向全球互联与深度资料调研辅助模型 (`gemini-search`, `perplexity...`)。

### 🧰 免费的创作者辅助系统 (永远可以使用 — 无需密钥)
- 🆓 `gen_edit_image_free` : 免费生成与编辑图像（约 20 次/天，任何模型，无密钥）。
- 🆓 `gen_video_free` : 免费文生视频，支持首帧图像与音频输入（约 5 次/天，无密钥）。
- 🧹 `object_remover` : 提示词即时物体抹除（30-120秒，无密钥）。
- 📐 `image_upscaler` : 免费 2x/4x 图像无损放大（30-120秒，无密钥）。
- ✨ `image_enhancer` : AI 图像画质增强 — 降噪、锐化、画质修复（30-120秒，无密钥）。
- ✂️ `remove_background` : 超快原生 AI 自动抠图功能 (rmbg / bgeraser)。
- 🛠️ `gen_qrcode`、`gen_diagram`、`gen_palette`、`extract_frames`、`extract_audio`、`file_to_url` 实用开发者辅助。

### 💻 本地终端命令集列表
你随时可以在聊天的终端呼叫代号 **`/poll`**（推荐）或 **`/pollinations`**:
- `/poll help` : 打开交互命令大全列表。
- `/poll login` : **浏览器一键登录**（Device Flow）— 自动创建并绑定密钥。
- `/poll connect <密钥>` : 手动配置 "自带密钥 (BYOK)" (`sk_...`)。
- `/poll quests` : 查看你的任务及可领取的免费 Pollen。🎯
- `/poll usage full` : 个人资料控制台看板，观测实时 Quests 流量和预存花粉余额。
- `/poll config` : 针对超时、语言、防爆额度的参数深度微调。
- `/poll models` : 即刻一览所有状态是在线的支持库模型。
- `/poll pricing` : 核对全网 Pollen (期望折线花费) 平均列表价格。
- `/poll mode <mode>` : 切换计费模式 (`quest`, `quest_only`, `paid`, `manual`)。
- `/poll fallback` : 定义在免费服务崩溃时你的紧急底层大模型通道。
- `/poll infos` : 详细的功能特性说明与使用指南。

---

## 🛡️ "Cost Guard" 警卫系统 ＆ "安全降落路线" (Safety Net)

我们非常在乎您的私人资产和宝贵开发工序，因此设置了这些保护带确保您高枕无忧:

- 🛟 **安全降落路线 (Safety Net)**: 如果你在写程序的深夜用光了 Quest/Paid 余额，此时你的所有 Premium 调度命令就会触发拦截，并安静快速的回退降落至 免费通用型大模型 (Free fallback models)。*拒绝让你因为 429 Error 失联。*
- 🚦 **防爆预警 (Cost Guard)**: OpenCode的自动助手有时会擅作主张消耗运算生成特别复杂的超长视频或3D渲染。所有超出警戒阈值的资源任务均会被打断并冻结挂起，系统会要求您通过 `polli_gen_confirm` 确认后方才执行扣费。

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

> 🎁 **前往 [enter.pollinations.ai](https://enter.pollinations.ai) 获取你的免费个人密钥 (BYOK)，为 OpenCode 加速！**

**工作原理：**
1. 在常规模型上，你的 Quest Pollen 会被优先消耗。
2. 💎 仅限付费的模型始终使用已购买的 Pollen。
3. 当两个余额都已耗尽时，安全网会优雅地切换到免费的备用模型。

---

## 🌍 首发全球化本地支持 (i18n)

Pollinations for OpenCode 已提供母语原生语言支持，沟通无缝顺畅:
- 插件主程序的内部控制模块界面、消息横幅提醒(Toasts)、命令参数界面与工具反馈都已为您贴心地支持 **英语**、**法语**、**西班牙语**、**德语**、**意大利语** 和 **中文**。
- 可随时使用一键口令 `/poll config lang <en|fr|es|de|it|zh>`，终端界面便能瞬息转换语系状态。

---

## 🚀 起步向导指引 (Onboarding)

### 🐧 1. 跨平台系统预案配置 (NPM)
全系终端系统通吃 **完全支持跨平台架构兼容** (涵盖 Windows, macOS, 与 Linux ; Node **≥ 18**)，并自动启动本地代理。

1. 全局或本地安装：
   ```bash
   npm install -g opencode-pollinations-plugin
   ```
2. 自动注入配置：
   ```bash
   npx opencode-pollinations-plugin
   # 或：npx opencode-pollinations-plugin --check
   ```
   *(将自动把 `opencode-pollinations-plugin` 写入你的 `~/.config/opencode/opencode.json` 文件中)*

### 🔑 2. 入场初始化引导

部署完成后，在 OpenCode 终端中选择以下任一方式连接你的账号：

**方式 A — 浏览器一键登录（推荐）：**
```bash
/poll login
```
浏览器将自动弹出，使用 GitHub 登录并点击 **Authorize** — 插件即可全自动完成配置，无需复制粘贴密钥。

**方式 B — 手动输入密钥：**
```bash
/poll connect sk_你的密钥
```
在 [enter.pollinations.ai](https://enter.pollinations.ai) 上创建 **Secret** 密钥并粘贴至此。*(重启 OpenCode 即可刷新 UI 中的模型列表)*。

---

## 🔗 相关链接

- **控制台与 API 密钥** : [enter.pollinations.ai](https://enter.pollinations.ai)
- **Discord 官方社区** : [欢迎加入！](https://discord.gg/pollinations-ai-885844321461485618)
- **OpenCode 生态圈** : [opencode.ai](https://opencode.ai/docs/ecosystem#plugins)

## 📜 源码授权协议 (License)

全面遵循 MIT 开源协议. 由 [fkom13](https://github.com/fkom13) 与 Pollinations 社区共同打造。
