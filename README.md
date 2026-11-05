# dsh-prompt-workshop · 提示词工坊

![Prompt Studio 提示词工坊](icon.jpg)

把粗糙想法变成**目标生成模型可以直接使用**的精准提示词：选中目标生成器（Midjourney / SDXL / FLUX / GPT-Image / **豆包 Seedream** / 即梦 / Sora / Veo / 可灵 / 海螺 / Runway / Pika / Vidu / 万相 / **豆包 Seedance** …），输入一句话，得到主提示词、负向提示词、参数建议、多个变体和缺口分析。

DeepSeek Harness（DSH）原生插件：Host 半侧提供工具与 HTTP API，浏览器半侧提供输入框 ✨ 工作台与设置页。

## 功能

- **输入框工作台**：会话输入框左侧 ✨ → 浮层面板；选目标生成器 → 输入想法 → 生成 → 复制 / 插入输入框 / 直接发送；一键「更简洁 / 更电影感 / 更写实 / 加细节」继续迭代。
- **19 个目标模型规范**（内置知识库，含每个模型的语法规则、参数建议、正/负向提示词规范）：
  Midjourney、SDXL、SD 3.5、FLUX.1、GPT-Image、**豆包 Seedream（图片）**、即梦、可灵 Kling、海螺 Hailuo、Sora 2、Veo 3.1、Runway Gen-4、Pika 2.2、Vidu、Wan 2.2、**豆包 Seedance（视频）**、通用文生图 / 文生视频 / 通义文本。
- **多模型选择**：增强用大模型下拉列出 DSH「设置 → 模型」里已配置的全部模型（DeepSeek 账号全系 + 你添加的任何 OpenAI 兼容端点），不额外保存 API Key；也可在设置页设默认模型，或「跟随当前会话模型」。
- **Agent 工具**：在对话里直接说「帮我把这个想法变成精准提示词」「这个 prompt 为什么效果不准」，AI 会调用
  `prompt_enhance` / `prompt_score` / `prompt_targets`（含豆包等目标模型规范查询）。
- **设置页**：设置 → 提示词工坊（或 插件 → dsh-prompt-workshop），配置默认目标/风格/模型/语言/变体数、生成后动作、系统提示注入开关、清空历史。
- **图片反推提示词**：面板里上传/粘贴一张参考图 → 反推「能复现这张图」的目标模型提示词（需要支持图片输入的大模型）。
- **知识库周期自更新**：插件每 N 天（默认 5 天）联网检索相关模型/提示词的新消息，提炼成增量应用到本地知识库（可设开关与周期、可「立即收集」、可「恢复内置知识库」，每轮生成中文报告）。搜索优先用 DeepSeek 搜索；无会话凭证时自动回退 Bing RSS + 官方文档种子页（无需 API key）；支持「官方文档补全」与「新变化」两类更新。对话里说「更新一下提示词知识库」也能触发（后台执行）。
- **本地数据**：设置与历史保存在 `~/.dsh/prompt-workshop.json`，知识库增量保存在 `~/.dsh/prompt-workshop-knowledge.json`，升级插件不丢；内置知识库随包分发，仅周期收集时才联网。
- **质量评分**：10 维 rubric（意图清晰度、主体具体性、构图与镜头、光线与色彩、风格一致性、运动与时序、音频与对白、参数适配、语言与语法、合规与版权）。

## 安装

- 插件市场（推荐）：DSH → 插件 → 市场，搜索「提示词工坊 / Prompt Studio」；或从 Discover 索引安装。
- GitHub：dsh plugin --profile <profile> add github:<owner>/dsh-prompt-workshop
- 源码：git clone 后执行 dsh plugin --profile <profile> add link:<仓库绝对路径>；Desktop 用户请在「设置 → 插件」里用插件管理器链接安装。

安装后在 设置 → 提示词工坊（或 插件 → 提示词工坊）里配置模型与知识库。

## 使用

1. 打开任意会话，输入框左侧点 **✨**。
2. 选「目标生成器」（例如 豆包 · Seedream（图片））、按需选任务类型 / 风格 / 增强模型 / 变体数量。
3. 在「粗糙想法」里写一句话，点「生成精准提示词」。
4. 结果区：复制 / 插入输入框 / 直接发送；或点快捷按钮继续迭代。
5. **图片反推**：面板里点「🖼️ 图片反推」上传图片（或直接把图片粘贴进面板）→ 反推提示词。
6. 设置 → 提示词工坊 里可以设默认值、关掉系统提示注入、清空历史；「知识库自动更新」区可设周期/立即收集/恢复内置知识库并查看报告。

在对话中直接说需求也可以，例如：

> 把「雨夜东京街头，一个撑透明伞的女人」变成可灵 4.0 的视频提示词
> 帮我看看这段 Midjourney 提示词为什么效果不准

## 目标模型支持（摘要）

| 类型 | 目标模型 |
| --- | --- |
| 图片 | Midjourney（V7/V8.2）、SDXL、SD 3.5、FLUX.1、GPT-Image、**豆包 Seedream**、即梦、通用文生图 |
| 视频 | 可灵 Kling 4.0、海螺 Hailuo（H3/Hailuo-02）、Sora 2、Veo 3.1、Runway Gen-4、Pika 2.2、Vidu、Wan 2.2、**豆包 Seedance**、通用文生视频 |
| 文本 | 写作 / 代码 / 翻译 / 分析 / 通用 |

规范来源与「待核实」清单见 [research/prompt-knowledge.md](research/prompt-knowledge.md)（36 条来源，含官方文档与社区交叉验证）。参数建议**不做硬校验**；带「待核实」的条目请以平台官方文档为准。

## 开发

```text
index.js              Host 插件入口：工具 + HTTP API + 系统提示注入
client.js             浏览器 bundle（单文件、无需构建；window.__ModuleLoader__.load）
lib/
  presets.json        内置知识库（由 scripts/build-presets.mjs 从 research/presets.json 生成）
  presets.js          知识库读取 + 缓存（按文件 mtime 失效）
  engine.js           提示词构建 / JSON 解析 / 本地启发式评分
  llm.js              ctx.llm 模型目录与一次性调用
  service.js          generate / score / targets / state 业务逻辑
  store.js            ~/.dsh/prompt-workshop.json 设置与历史
scripts/
  build-presets.mjs   由调研结果生成 lib/presets.json
  install-desktop.mjs / uninstall-desktop.mjs
test/                 纯 node 测试（无需安装依赖）
research/             网络调研原始材料（不随包分发）
```

运行测试（Windows 沙箱下 `node --test` 会因子进程管道被限制而 EPERM，直接逐文件运行）：

```sh
node test/presets.test.mjs
node test/engine.test.mjs
node test/store.test.mjs
node test/client.smoke.mjs
```

重建知识库：`node scripts/build-presets.mjs`。

## 已验证 / 已知限制

已验证（v0.2.0，激活前已通过测试）：
- 单元/集成测试：presets 5、engine 9、knowledge 7、store 4、service 6、client 冒烟 5 全部通过。
- 图片反推与知识库收集的失败路径（无 web / 无附件 / 无模型）均返回结构化错误。
- v1 已验证：Host 插件热装载、3 个工具端到端调用成功（含豆包图片提示词、评分与改写建议）。
- `/dsh-prompt-workshop` 路由：/health、/state、/targets、/settings、/graph 正常；设置与历史持久化正常。
- 客户端 bundle 已进入 DSH 客户端模块图并由 `/plugins/...` 正常分发（combo bundle 语法校验通过）。

已知限制：
- 面板 UI 的真机观感（深浅色主题、浮层定位）尚未逐像素确认；若刷新后输入框旁没有 ✨，请刷新一次页面（Ctrl+R）。
- API 仅接受本机回环请求，局域网/反向代理访问面板不可用。
- 图片反推提示词（上传图片 → 反推 prompt）、插件内独立 API Key 渠道未包含在 v1。
- 知识库中标注「待核实」的参数属于社区交叉验证结果，插件仅作建议。

## 路线图（待批准后自我迭代）

- ✅ v0.2.0 已实现：知识库周期自更新（可调周期/立即收集/恢复/报告/官方文档补全）、图片反推提示词、设置页知识库面板。
- 迭代 2 候选：收集质量（官方 JSON/README 白名单、来源分级、变更 diff 与「应用/忽略」确认）、多模型对比模式、提示词 A/B 评测、图片反推增强、UI 打磨。

## License

MIT
