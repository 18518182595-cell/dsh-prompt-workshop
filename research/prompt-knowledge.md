# DSH 提示词工坊 · 内置提示词知识库

- version: 1.0.0
- 生成日期: 2026-11-05（时间基准 2026-11）
- 用途: dsh-prompt-workshop 插件的内置知识库（随插件打包），供"增强/改写/评分"提示词使用
- 配套文件: presets.json（targets/styles/rubric/outputSchema 的结构化版本）

核实标记：

- 【官方·已核实】本环境已抓到官方文档正文并摘录
- 【官方·页面存在】官方页面存在，但正文由 JS 渲染或被 403 拦截，本环境未取到原文；只采信标题/元信息
- 【社区】社区整理、开发者指南或第三方厂商文档，非模型官方
- 【待核实】数值/语法未被官方原文确认；插件不应据此做硬性校验，只作建议

重要前提：生成式模型版本迭代极快（2026 年 11 月时，Midjourney 默认已是 V8.2、可灵已是 4.0、MiniMax 主推 H3、豆包 Seedream 已有 5.0 提示词指南）。本知识库把"任务要求的版本"和"当前版本"都写出来，并在 presets.json 里逐项标 confidence。

---

## 1. 版本速查（2026-11）

| 目标 | 当前版本状态 | kind | 语言 | 核实度 |
| --- | --- | --- | --- | --- |
| Midjourney | V8.2 为默认（2026-07-24 起）；V7 可用 --v 7 指定；V8.x 用 Edit Model 取代 --oref/--cref | image/video | 英文优先 | 官方·已核实 |
| Stable Diffusion SDXL | SDXL 1.0 base/refiner，1024×1024 原生 | image | 英文 | 部分官方（A1111 文档） |
| Stable Diffusion SD3.5 | Large 8B / Large Turbo / Medium 2.5B，原生 1024² | image | 英文优先 | 社区·待核实 |
| FLUX.1 | FLUX.1 系列仍在 BFL 价格/模型清单中；官方文档主推 FLUX 3（图像/视频/音频）与 FLUX.2 | image | 英文优先 | 官方·部分已核实 |
| GPT-Image | GPT-Image-2.5-Sunburst（最强编辑）/2.5-Flare（最快）/GPT-Image-2（4K）/1.5/1/Mini；DALL·E 3 已于 2026-03-04 退役 | image | 双语 | 官方·已核实（Azure 文档） |
| 豆包 Seedream | 4.0/4.5 在售；火山方舟已出现"Seedream 4.0-5.0 提示词指南"页面标题 | image | 中文原生 | 官方·页面存在 |
| 即梦 Dreamina | 字节消费级产品，底层用 Seedream/Seedance 系（BytePlus 文档提到 Dreamina Seedance 2.0/2.5、Seedream 4.0-4.5） | image/video | 中文原生 | 官方·页面存在 |
| 可灵 Kling | Kling 4.0（原生最长 30 秒、Omni Reference、最多 10 张关键帧）；Kling 2.5 仍可用 | video | 中文原生 | 官方·已核实 |
| 海螺 Hailuo | 当前主推 MiniMax-H3（768P/2K，4-15 秒）；MiniMax-Hailuo-02 / Hailuo-2.3 仍在 API 模型列表 | video | 中文原生 | 官方·已核实 |
| Sora 2 | OpenAI Sora 2 / Sora 2 Pro，原生音频；官方 Cookbook 提示词指南被 403 | video | 双语 | 官方·页面存在 |
| Veo 3.1 | Google Veo 3.1：原生同步音频、首帧图生视频、参考素材 | video | 双语 | 官方·页面存在 |
| Runway Gen-4 | Gen-4 / Gen-4 Turbo，5/10 秒，图生视频为主 | video | 英文优先 | 官方·已核实 |
| Pika 2.2 | 消费级网页产品；版本可能已更新到 2.2 之后 | video | 英文 | 低（文档稀缺） |
| Vidu | 生数科技；阿里云 Model Studio 上架 Vidu 图像（1K/2K/4K）与视频模型 | image/video | 中文原生 | 官方·已核实（阿里云 API 文档） |
| Wan 2.2 | 阿里开源视频模型，MoE 架构，480P/720P 级 | video | 中英双语 | 官方·已核实（GitHub README） |
| Seedance | Seedance 1.0 官方页：1080p、多镜头；BytePlus 已出现 Seedance 2.5/2.0 | video | 中文原生 | 官方·已核实（1.0）/页面存在（2.x） |

---

## 2. 通用方法论

### 2.1 图像提示词骨架（8 段，顺序可调）

主体 → 主体细节/材质 → 动作/状态 → 场景/背景 → 构图/镜头 → 光线/色彩 → 风格/媒介 → 文字/技术参数

示例（通用文生图）：

    A weathered fisherman mending a net on a foggy wooden pier at dawn,
    salt-stained wool sweater, deep wrinkles, wet planks,
    medium shot, low angle, 85mm lens, shallow depth of field,
    soft blue-grey morning light with warm rim light from the left,
    documentary photography, muted film color grade, fine grain,
    no text, no watermark

要点：

1. 先给"可画出来的东西"（名词+动作+位置），再给情绪与风格；情绪词不能替代具体描述。
2. 一个提示词只服务一个视觉中心；多主体时明确主次与位置关系。
3. 构图/镜头词是"可控性开关"，比堆质量词更有效。
4. 文字渲染：需要出字时，用引号给出精确字符串（SD3.5 官方指南示例："a hand-painted shop sign reading "Harbor Books""）；其余情况主动排除文字。

### 2.2 视频提示词骨架（7 段）

镜头/景别 → 主体与动作 → 环境 → 镜头运动 → 光线/氛围 → 风格/质感 → 时长/节奏/音频

镜头词汇表（跨模型通用）：

| 类别 | 词汇 |
| --- | --- |
| 景别 | extreme wide shot, wide shot, full shot, medium shot, close-up, extreme close-up, over-the-shoulder |
| 机位/角度 | low angle, high angle, eye level, Dutch angle, bird's-eye, worm's-eye |
| 运镜 | push in / dolly in, pull out, pan left/right, tilt up/down, truck left/right, tracking shot, orbit, crane up/down, handheld, FPV, whip pan, rack focus, zoom in/out |
| 速度/节奏 | slow motion, time-lapse, speed ramp, steady, handheld shake |
| 镜头规格 | 24mm/35mm/50mm/85mm, anamorphic 2.0x, macro, shallow/deep focus, 180° shutter |

原则：

1. 视频模型对"运动"最敏感：写清"什么在动、怎么动、镜头怎么动"。
2. 一镜到底 vs 多镜头：Seedance 1.0 官方明确支持原生多镜头叙事；Sora 2 用 action beats 分段；Veo/Kling 也可分镜描述。
3. 时长与动作量匹配：5 秒只写 1-2 个动作节拍；10 秒可 2-3 个。
4. 音频（Sora 2 / Veo 3.1 / FLUX 3 / MiniMax H3）：对白用引号 + 说话动词（says/whispers/shouts）；音效单列 Audio/SFX 标签。Veo 官方指南（未取到原文）与社区整理均强调"对白最长约 8 秒"【待核实】。

### 2.3 文本任务骨架

角色 → 目标 → 输入/上下文 → 约束（长度/语气/格式/禁用项）→ 输出格式 → 示例（可选）

- 写作：受众、体裁、字数、语气、必须包含/禁止出现、结构（标题/小节）。
- 代码：语言与版本、框架、输入输出契约、边界条件、错误处理、测试要求、禁止依赖。
- 翻译：源/目标语言、领域、术语表、保留项（变量/占位符/代码）、文体（口语/正式）。
- 分析：结论先行、证据引用、不确定性标注、可执行建议。
- 通用：把"评分标准"写进提示词（rubric-in-prompt）通常比"写好一点"有效。

### 2.4 中英文提示词差异

| 类别 | 建议 |
| --- | --- |
| MJ / SD / FLUX / Runway / Pika | 英文更稳；中文可出图但语义漂移与风格偏移更明显 |
| 豆包 Seedream / 即梦 / 可灵 / 海螺 / Seedance / Vidu / Wan | 中文原生支持；中文描述可直接用，专有名词可保留英文 |
| Sora 2 / Veo 3.1 / GPT-Image | 中英文均可；对白/字幕语言要与目标语言一致 |

中文提示词要点：少堆抽象形容词，多写具体名词与动作；明确数量、方位、景别；需要出字时用引号给原文；避免长定语套娃。
英文提示词要点：自然语言长句或逗号短语都能工作；避免中式英语；风格词用通用术语（cinematic, editorial, isometric, low-poly 等）。

### 2.5 负向提示词规范

支持独立 negative prompt 的：SDXL/SD3.5 Large&Medium、Wan、可灵 API（negative_prompt）、部分开源视频管线。
不支持/受限的：FLUX.1（官方明确用正向描述替代负向）、Runway Gen-4（官方明确不支持负向措辞，写了可能反向）、Midjourney（只有 --no）、Sora/Veo（无独立负向字段，用正向约束表达）。

通用负向清单（按需裁剪，不要无脑堆）：

    low quality, worst quality, blurry, out of focus, jpeg artifacts,
    watermark, signature, text, logo, extra fingers, deformed hands,
    bad anatomy, disfigured, duplicate, cropped, frame, border,
    oversaturated, plastic skin, cartoon (当需要写实时)

视频补充负向：flicker, jitter, frame tearing, morphing artifacts, inconsistent identity, extra limbs, sudden cut（当需要一镜到底时）。

### 2.6 参数速查

| 参数 | 常用值 |
| --- | --- |
| 宽高比 | 1:1 / 4:3 / 3:2 / 16:9 / 21:9 / 2:3 / 3:4 / 9:16 |
| 图像分辨率 | SDXL 1024²；SD3.5 1024²（Medium 最高约 1440²）；FLUX 3 最高 4K；Seedream 2K/4K【待核实】；GPT-Image-2 支持 4K |
| 视频分辨率 | 720p / 1080p 主流；Hailuo H3 768P/2K；Kling 4.0 最高 2K 级 |
| 视频时长 | Runway 5/10s；Kling 5/10s（4.0 原生最长 30s）；Hailuo 02 6/10s、H3 4-15s；Veo 4/6/8s；Sora 2 4/8/12s【待核实】；Seedance 5/10s【待核实】；Wan 5s；Vidu 4/8s【待核实】 |
| CFG / guidance | SDXL 5-8【社区】；SD3.5 Large guidance 3.5【社区】；FLUX.1 dev guidance 约 2.5-4【待核实】 |
| 采样步数 | SDXL 25-35【社区】；SD3.5 Large 28 步；SD3.5 Large Turbo 约 4 步（CFG-free，负向无效） |

---

## 3. 各目标规范

### 3.1 Midjourney（V7 / 当前默认 V8.2）

版本状态【官方·已核实】：V8.2 于 2026-07-24 成为默认版本；V7 于 2025 年发布并可继续用 --v 7 调用。V8.2 引入 Edit Model，取代 Omni Reference（--oref）、Character Reference（--cref）与 Retexture 工具；V8.x 下建议用 Edit Model（最多 4 张参考图）。Omni Reference 只在 V7 可用。

语法规则【官方·已核实】：

- 参数永远放在提示词末尾，参数前留一个空格；参数内部不要用逗号、句号等标点；参数后不要再写提示词。
- --ar 或 --aspect W:H：任意比例会被约分；不接受小数（8.5x11 英寸要写 --ar 85:110）。
- --stylize 或 --s：0-1000，默认 100；越低越贴提示词，越高越艺术化。
- --weird 或 --w：默认 0，最高 3000，越高越实验性。
- --sref <图片URL>：风格参考，可多张；--sw 0-1000，默认 100（风格权重）。
- --oref <图片URL> + --ow：V7 的全能参考（人物/物体/载具/生物），V7 专属；会消耗约 2 倍 GPU 时间；与 Fast/Draft/Conversational 模式及 --q 4 不兼容；--ow 权重范围本环境未取到原文【待核实：官方常写 0-1000】。
- 其他：--no 排除内容、--chaos/-c 增加变化【范围待核实：0-100】、--seed、--tile、--raw、--p/--profile（个性化）、--repeat/-r、--q 质量【V7 起有 --q 4；其余档位待核实】、--v 版本。
- 视频：基础为图片转 5 秒视频；视频专用参数 --motion low|high、--raw、--loop、--end、--bs #（官方 Video 页）。更长时长/延展能力【待核实】。

提示词策略：

- 英文优先；写具体主体+环境+镜头+光线+媒介，参数只做微调。
- 想稳定出系列图：固定 --sref + --sw，或 V7 用 --oref + 文本描述；V8.2 用 Edit Model 最多 4 张参考。
- --raw 降低默认风格化，提升提示词服从度。
- 不要用 MJ 当"精确排版工具"：文字渲染弱，需出字时给短引号字符串并多试。

示例（本知识库构造，非官方示例）：

    cinematic portrait of an elderly fisherman mending a net on a foggy wooden pier at dawn, salt-stained wool sweater, weathered face, medium shot, soft rim light from the left, 85mm lens, shallow depth of field, muted film color grade --ar 3:2 --s 180 --v 7

来源：Parameter List（2026-09-01 更新）、Version、Aspect Ratio、Stylize、Style Reference、Weird、Omni Reference、Video、Edit Model（URL 见第 10 节）。

### 3.2 Stable Diffusion SDXL

版本状态：SDXL 1.0 base + refiner，原生 1024×1024【官方·A1111 文档】。

语法规则【A1111 官方项目文档·已核实】：

- 强调权重：a (word) 约 ×1.1；a ((word)) 约 ×1.21；a [word] 约 ÷1.1；a (word:1.5) 精确倍率；转义用 \( \)。
- BREAK（大写）切分提示词块，避免概念串味。
- 负向提示词独立输入框。

参数建议【社区·待核实】：CFG 5-8；步数 25-35；采样器 DPM++ 2M Karras；refiner 去噪 0.2 左右；分辨率贴 1024² 或官方比例桶。

提示词策略：主体+风格+光线+构图；质量词只保留少量；负面清单按场景裁剪；权重不要超过 1.5（易糊/崩）。

示例（本知识库构造）：

    (masterpiece:1.2), portrait of a female astronaut, (detailed helmet visor reflecting Earth:1.3), white suit, volumetric light, cinematic, 85mm photo, ultra detailed
    Negative: lowres, bad anatomy, bad hands, extra fingers, watermark, text, jpeg artifacts

### 3.3 Stable Diffusion 3.5

版本状态【社区指南·待核实】：SD3.5 Large 8B（旗舰，28 步，guidance 3.5，原生 1024²）、Large Turbo（约 4 步、CFG-free，负向无效）、Medium 2.5B（最高约 1440²，约 40 步）；三编码器 CLIP-L + CLIP-G + T5-XXL，擅长长句与图中文字。

语法规则：自然语言成句优于标签堆砌；结构 = 主体 + 场景 + 细节 + 风格 + 构图 + 光线 +（可选文字）；精确文字用双引号；Large/Medium 支持负向提示词，Turbo 负向无效。

参数【社区·待核实】：flow-match Euler，time-shift 3.0；guidance 3.5 起调（高更服从，低更发散）。

### 3.4 FLUX.1（Black Forest Labs）

版本状态【官方·已核实】：BFL 现主推 FLUX 3（图像/视频/同步音频）与 FLUX.2；FLUX.1 仍在价格/模型清单中，旧参数页不再位于文档索引首位。下列"FLUX 3 图像/视频"规则来自官方文档正文；FLUX.1 专属数值【待核实】。

语法规则【官方 FLUX 3 文档·已核实】：

- 用一段完整自然语言描述：主体、场景、风格、光线、构图；FLUX 3 图像支持多参考图，按位置引用（image 1、image 2），并可用 bounding box 指定元素位置。
- 宽高比：FLUX 3 图像为 15 个固定比例（21:9 到 9:21）或 auto；auto 跟随第一张参考图，无参考图时为 1:1；分辨率可达 4K。
- 负向提示词：官方明确"用正向描述替代 negative prompts"（FLUX.1 与 FLUX 3 均无独立负向字段）。
- 视频：t2v、i2v、关键帧插值、视频续写（v2v）；提示词写镜头运动与声音。
- FLUX.1 常见参数（旧版，【待核实】）：width/height 或 aspect_ratio、steps、guidance、seed、prompt_upsampling、safety_tolerance。

提示词策略：像给摄影师写 brief 一样完整；先写"画面是什么"，再写"怎么拍"；不要期待负向词。

示例（本知识库构造）：

    Ultra-wide cinematic shot of a fog-drenched coastal highway at dawn, cliffs on one side, turquoise sea on the other, a single vintage car with headlights on, soft golden rim light, 21:9

### 3.5 GPT-Image（OpenAI）

版本状态【官方·已核实，Azure 文档】：DALL·E 3 于 2026-03-04 退役；当前为 GPT-Image 系列：GPT-Image-2.5-Sunburst（最强图像生成与编辑、编辑精度最好）、GPT-Image-2.5-Flare（最快的高质量日常生成）、GPT-Image-2（高分辨率/4K、广比例、编辑增强）、GPT-Image-1.5、GPT-Image-1、GPT-Image-1-Mini；输出为 base64（无 URL 选项）。DALL·E 3 已不可用。

语法规则：自然语言描述为主；对话式迭代（"把背景换成夜晚"）；需要出字时在提示词里给精确字符串；不支持独立负向字段，用正向约束（"背景干净，没有文字"）。

参数【部分待核实】：size / quality（low/medium/high）/ n / output_format / background；GPT-Image-2 支持 4K 与更多比例。具体像素档位本环境未取到完整表格【待核实】。

提示词策略：把它当"会画画的编辑"——描述场景、主体、风格、构图、文字；复杂需求拆成多轮；参考图编辑时说明"保留什么、改什么"。

示例（本知识库构造）：

    A cozy Japanese kissaten at dusk, warm tungsten light, rain-streaked window, a cup of latte on a walnut table, 35mm film look, shallow depth of field, no text, no watermark

### 3.6 豆包 Seedream（图片，官方代号 doubao-seedream）

版本状态【官方·页面存在】：火山方舟/BytePlus 文档已有"Seedream 4.0-4.5 提示词指南"；火山方舟另有"Seedream 4.0-5.0 提示词指南"页面。5.0 具体参数【待核实】。

语法规则【官方页面标题/公开资料，正文未抓取】：中文自然语言为主，支持文生图、图生图/编辑、参考图生成、组图（一次多张）、中文文字渲染；常用参数包括尺寸/比例、2K/4K 档位、seed、水印开关、参考图数量。具体字段名与取值【待核实】。

提示词策略：中文写"主体+场景+风格+光线+构图"；需要文字时用引号给中文原文；组图任务写清"同一主体、不同画面"的分镜描述；电商/海报类写明版式与留白。

示例（本知识库构造）：

    中国风电商海报：一位年轻女性在江南园林中撑油纸伞，浅青色旗袍，清晨薄雾，柔和侧光，中景构图，右上角留白用于标题，高级质感，8K 细节

### 3.7 即梦（Dreamina，字节）

版本状态【官方·页面存在】：即梦是字节消费级 AI 创作产品（国际版 Dreamina），底层使用 Seedream（图像）与 Seedance（视频）系模型；BytePlus 文档已出现 Dreamina Seedance 2.0/2.5 与 Seedream 4.0-4.5 的资料。具体模型档位与参数【待核实】。

语法规则：中文自然语言；支持文生图/图生图/视频，参考图、首尾帧、运镜等能力随版本变化；App 内通常不暴露 CFG 等底层参数。

提示词策略：中文短句、具体主体与动作；视频写清"镜头怎么动"与"画面里什么在动"；需要出字时给引号原文；用参考图锁定人物/商品一致性。

### 3.8 可灵 Kling（当前 4.0；2.5 仍可用）

版本状态【官方·已核实】：Kling 4.0 是原生多模态视频模型，原生最长 30 秒、支持 Omni Reference、最多 10 张关键帧；API 有三类入口：Omni Reference、Image-to-Video、Text-to-Video。

语法规则【官方·已核实，来自 Kling 4.0 用户手册与提示词指南】：

- 提示词按"整体风格 → 角色/车辆 → 场景与道具 → 镜头与动作 → 声音"分段写；官方示例用方括号分节（[Overall Style]、[Characters and Vehicles] 等）。
- 支持首帧/尾帧、关键帧序列、Omni Reference 多素材参考。
- 镜头运动、时长、比例、模式等走 API 参数（duration、aspect_ratio、mode、camera_control 等）；负向提示词字段在 API 中存在【待核实其当前取值范围】。
- Kling 2.5 常见规格：5/10 秒、16:9/9:16/1:1、std/pro 模式、可选首尾帧、运镜控制【官方旧版参数待核实】。

提示词策略：中文原生最佳；分镜写清每段"主体动作+镜头运动"；角色一致性用参考图而不是反复描述长相；复杂动作拆成短节拍。

示例（本知识库构造，按官方分节风格）：

    [Overall Style] 10 秒，写实电影质感，黄昏海边，手持轻微晃动
    [Characters and Vehicles] 一位穿深色风衣的女性，短发，沿沙滩向镜头走来
    [Camera] 低机位，缓慢推近，最后停在半身特写
    [Audio] 海浪声，风声，远处海鸥

### 3.9 海螺 Hailuo（当前 MiniMax-H3；Hailuo 02 仍可用）

版本状态【官方·已核实】：MiniMax 当前主推 MiniMax-H3（开放通用多模态视频模型）：输出 768P/2K，时长 4-15 秒（整数），提示词上限 7000 字符；文生视频、首/尾帧图生视频、参考生成（≤9 张图、≤3 段视频、≤3 段音频，混合总文件 ≤12）。MiniMax-Hailuo-02 / Hailuo-2.3 仍在 t2v API 模型列表；Hailuo-02 提示词上限 2000 字符，支持 [命令] 语法控制运镜；首尾帧模式不支持 512P【官方·已核实】。

语法规则【官方·已核实】：Hailuo-02 可用方括号命令控制镜头（如 [Push in]、[Pan left]、[Truck left]、[Zoom in] 等，具体命令表见官方 API 文档【待核实完整列表】）；H3 支持文本/图像/视频/音频混合输入，用自然语言描述镜头、声音、情绪、风格。

提示词策略：中文原生；一段话写清"谁、在哪、做什么、镜头怎么动"；需要运镜时用方括号命令；参考生成时明确每张参考图的作用（角色/场景/风格）。

### 3.10 Sora 2（OpenAI）

版本状态【官方·页面存在】：Sora 2 / Sora 2 Pro，原生音频；官方 cookbook 提示词指南（developers.openai.com）在本环境被 403，以下综合社区转述的官方指南与 fal 指南【社区·待核实】。

语法规则【社区整理·待核实】：结构化模板 = 散文式场景描述 + Cinematography 块（shot/lens/lighting/mood）+ Actions 分节拍 + Dialogue；100-250 词效果最佳，超过 250 词收益递减；支持镜头/胶片/滤镜/快门/调色等制作级细节；对白要短；角色可用参考 ID（API 最多 2 个）。

提示词策略：先写画面故事，再写摄影参数；动作按 beat 拆 2-4 段；对白一句一拍；需要音效时写环境声与画外音；英文更稳，中文也可。

示例（本知识库构造）：

    A woman in a red coat walks briskly through a crowded night market, neon reflections on wet pavement.
    Cinematography: low-angle tracking shot, 35mm anamorphic, shallow depth of field, warm practical lights, teal-and-orange grade.
    Actions: she glances back; a paper lantern sways; steam rises from a food stall.
    Dialogue: "This way," she says, barely audible.
    Audio: rain patter, distant chatter, sizzling wok.

### 3.11 Veo 3.1（Google）

版本状态【官方·页面存在】：Veo 3.1 原生同步音频，支持首帧图生视频与参考素材；官方提示词指南（cloud.google.com blog）在本环境抓取失败，以下依据社区整理版【社区·待核实】。

语法规则【社区·待核实】：

- 结构：主体/动作 + 环境 + 镜头/景别 + 光线/氛围 + 风格 + 音频 + 时长；50-200 词最佳。
- 对白：双引号 + 说话动词（says/whispers/shouts），如 A woman says, "Welcome to the future."；冒号写法也可；单条对白最长约 8 秒。
- 音效：Audio: / SFX: 标签或括号拟声（(thunder cracks)）。
- 支持 JSON 结构化提示词（镜头/音频/对白分字段）。
- 时长 4/6/8 秒。

提示词策略：先主体与镜头，再环境与声音；对白短、角色少；复杂场景用 JSON 结构化；中文可用，但英文对白口型更稳。

### 3.12 Runway Gen-4

版本状态【官方·已核实】：Gen-4 生成 5 秒或 10 秒视频，以输入图 + 文本提示词驱动；Gen-4 Image 也支持文生图。

语法规则【官方·已核实】：

- 只用正向措辞：官方明确"negative phrasing is not supported"，不要写 "no camera movement"，要写 "locked camera / the camera remains still"。
- 用简单直接的语言；避免抽象概念，把"感觉"翻译成具体物理动作。
- 指代主体用 "the subject" 等泛称，避免与参考图冲突。
- 提示词聚焦运动：主体运动、镜头运动、场景运动、风格描述；从简单开始，一次加一个元素迭代。
- 图生图/文生图：描述性而非对话式（写 "cinematic photograph of a giraffe..."，不要写 "can you generate..."）。

参数【部分待核实】：时长 5/10 秒；输出分辨率/比例以输入图为准；Gen-4 Turbo 更快更便宜。

### 3.13 Pika 2.2

版本状态【低置信】：Pika 为消费级网页视频产品，2.2 支持图生视频与特效/关键帧玩法；本环境未取到官方提示词语法文档，且版本可能已更新【待核实】。

语法规则【社区·待核实】：简短英文提示词，写主体动作 + 镜头运动 + 风格；以图片作为首帧；避免负向措辞；多用预设效果。

提示词策略：一个镜头一个动作；提示词 1-3 句；需要一致性时用首帧图；长片用多段生成再剪。

### 3.14 Vidu（生数科技）

版本状态【官方·已核实（阿里云 Model Studio API 文档，2026-10-11 更新）】：Vidu 图像模型 vidu/vidu-image_reference2image 支持文生图、图像编辑、参考图生图；输出 1K/2K/4K，1 张图，PNG；异步任务（创建任务→轮询）。视频模型支持文生视频/参考生视频/首尾帧【待核实具体参数】。

语法规则：中文提示词原生；写清主体、风格、构图；参考图任务说明"保留什么、改什么"；比例/分辨率走 API 参数。

提示词策略：中文短句 + 具体视觉描述；海报/信息图类强调版式、文字、层级；多人/多物体任务用参考图锁一致性。

### 3.15 Wan 2.2（阿里，开源）

版本状态【官方·已核实（GitHub README）】：Wan2.2 采用 MoE 架构，训练数据较 2.1 增加 65.6% 图像、83.2% 视频；官方强调电影级美学（光影、构图、对比、色调的细粒度标签）与复杂运动生成；支持文生视频/图生视频，480P/720P 档位【具体参数待核实】。

语法规则【部分待核实】：自然语言描述 + 电影级光线/构图词；负向提示词在开源管线中可用；中英文均可（中文原生）。

提示词策略：用"光线/构图/色调"具体词触发美学标签；动作写清起止状态；一镜到底为主，复杂叙事分段生成。

### 3.16 Seedance（豆包视频，字节）

版本状态【官方·已核实（seed.bytedance.com）】：Seedance 1.0 支持文生视频与图生视频，原生多镜头叙事，1080p，运动稳定、风格多样、提示词跟随强；BytePlus/火山方舟文档已出现 Seedance 1.5-pro、2.0、2.5 提示词指南【页面存在，参数待核实】。

语法规则：中文自然语言；多镜头时按"镜头 1/镜头 2"写清主体、动作、景别、转场；支持首尾帧、参考图、运镜、固定镜头、seed 等参数【具体字段待核实】。

提示词策略：中文写分镜脚本式提示词；人物一致性用参考图；每个镜头只写 1-2 个动作；需要口播/对白时标明语言与语气。

### 3.17 通用文生图（generic-t2i）

适用：未指定模型或小众模型。骨架见 2.1；参数按目标模型裁剪；默认英文 + 简短负向清单；比例按用途（头像 1:1、封面 16:9、手机 9:16、海报 2:3）。

### 3.18 通用文生视频（generic-t2v）

适用：未指定模型。骨架见 2.2；默认 5-8 秒单镜头；优先写"主体动作 + 镜头运动"；不写负向措辞（多数视频模型不支持）；需要音频的模型单列 Audio。

### 3.19 通用纯文本（generic-text）

写作/代码/翻译/分析均用 2.3 骨架；先给角色与目标，再给约束与输出格式；复杂任务要求"先列提纲再写"或"给 2 个方案"。

---

## 4. 任务类型（taskTypes）

| id | 中文 | 说明 |
| --- | --- | --- |
| t2i | 文生图 | 文字→图片；重点：主体/构图/光线/风格/比例 |
| i2i | 图生图 | 参考图/编辑；重点：保留项 vs 修改项、参考强度 |
| t2v | 文生视频 | 文字→视频；重点：运动、镜头、时长、音频 |
| i2v | 图生视频 | 首帧/首尾帧→视频；重点：让静图动起来的物理合理性 |
| writing | 写作 | 受众/体裁/结构/语气/字数 |
| coding | 代码 | 语言版本/接口/边界/测试/依赖限制 |
| translation | 翻译 | 语言对/领域/术语表/保留项/文体 |
| analysis | 分析 | 结论先行/证据/不确定性/建议 |
| general | 通用 | 其他文本任务，套用文本骨架 |

---

## 5. 风格预设（24 个，完整定义见 presets.json）

cinematic-photo 电影感摄影、film-35mm 胶片、editorial-fashion 时尚大片、studio-product 棚拍产品、chinese-ink 水墨、gongbi 工笔、guochao 国潮、ukiyoe 浮世绘、cyberpunk 赛博朋克、solarpunk 太阳朋克、anime-film 日式动画电影、3d-cartoon 3D 卡通、claymation 黏土定格、papercut 纸雕、isometric 等距插画、lowpoly 低多边形、vaporwave 蒸汽波、miniature-tilt 微缩移轴、double-exposure 双重曝光、blueprint 技术蓝图、storyboard 分镜线稿、food-photo 美食摄影、arch-viz 建筑可视化、documentary 纪实。

选用原则：风格词 ≤2 个；风格与主体/媒介匹配；视频风格词要兼容运动（如 claymation 适合定格感，不适合高速追车）。

---

## 6. 提示词质量评分 rubric（10 维）

评分 1-5 分/维，加权 100 分。维度、权重、5 分锚点：

| id | 维度 | 权重 | 5 分（优秀） | 1 分（不合格） |
| --- | --- | --- | --- | --- |
| intentClarity | 意图清晰度 | 15 | 一眼看出画面/任务目标，无自相矛盾 | 目标模糊或多目标冲突 |
| subjectDetail | 主体具体性 | 15 | 主体外形/材质/动作/数量明确 | 只有抽象名词 |
| compositionCamera | 构图与镜头 | 10 | 景别/机位/构图明确且服务主体 | 无构图信息或与主体冲突 |
| lightingColor | 光线与色彩 | 10 | 光源方向/色温/氛围可执行 | 只有"好看/高级" |
| styleCoherence | 风格一致性 | 10 | 风格词统一、与媒介匹配 | 风格词互相打架或堆砌 |
| motionTemporal | 运动与时序（视频） | 15 | 动作起止/镜头运动/节奏明确 | 静止描述或动作过量 |
| audioDialogue | 音频与对白（视频） | 5 | 对白短且格式正确、音效分层 | 长对白/无音频设计 |
| technicalParams | 参数适配 | 5 | 比例/时长/分辨率/CFG 与目标匹配 | 参数缺失或与模型不兼容 |
| languageSyntax | 语言与语法 | 10 | 语言匹配模型、参数语法正确 | 中英混杂、参数写法错误 |
| safetyIP | 合规与版权 | 5 | 无侵权角色/真人肖像风险，无违规内容 | 明确要求侵权/违规内容 |

对图像任务，motionTemporal 与 audioDialogue 不计入（权重转移给 intentClarity 与 subjectDetail）。

总分档位：

- 90-100：可直接生成，仅微调参数
- 75-89：补 1-2 个关键细节（通常构图/光线/参数）
- 60-74：结构可用但信息不足，需要增强
- 40-59：需重写主体与结构
- <40：意图不清，回到需求澄清

常见失败模式与修复（12 条）：

| 失败模式 | 症状 | 原因 | 修复 |
| --- | --- | --- | --- |
| 主体漂移 | 生成物与描述不符 | 主体太抽象/多主体无主次 | 具体化主体，标注主次与位置 |
| 风格堆砌 | 画面四不像 | 同时要求 3+ 风格 | 保留 1-2 个风格词，其余转光线/材质 |
| 构图失控 | 主体被裁/太小 | 无景别机位信息 | 加景别+机位+主体占比 |
| 光线空洞 | 画面平/灰 | 只写"高级感" | 写光源方向、色温、软硬、时间 |
| 文字乱码 | 图中文字错 | 未用引号/文字太长 | 给精确短字符串，多试，或后期加字 |
| 手部崩坏 | 手指畸形 | 通用模型弱点 | 避免手部特写，加 negative，缩小手部占比 |
| 视频闪烁 | 帧间跳变 | 提示词矛盾/动作过量 | 减动作，锁机位，缩短时长 |
| 运动违背物理 | 物体漂移/穿模 | 只写"运动"未写受力/路径 | 写清动作路径、速度、重力/接触 |
| 角色不一致 | 多镜头换脸 | 未用参考图 | 用 oref/Edit Model/参考图/角色 ID |
| 音频错位 | 口型对不上 | 对白过长/多人对话 | 单人对白 ≤8 秒，短句 |
| 参数失效 | 模型忽略 --ar 等 | 参数位置/语法错误 | 参数放末尾、空格正确、无标点 |
| 负向反效果 | 越禁越出现 | 模型不支持负向（Runway/FLUX） | 改正向描述 |

---

## 7. 增强 LLM 结构化输出 schema

presets.json 的 outputSchema 是 JSON Schema（draft 2020-12），字段：

- prompt: string，增强后的目标提示词（含目标模型语法）
- negativePrompt: string，负向提示词（不支持时为空字符串，并在 targetNotes 说明）
- params: object，模型参数（aspectRatio / duration / resolution / cfg / stylize 等，按目标裁剪）
- variations: array，2-3 个变体（label + prompt + 差异化说明）
- explanation: string，中文解释改了什么、为什么
- score: object，{total, dimensions:[{id,score,comment}], band}
- gaps: array，[{dimension, severity(info|warn|blocker), issue, fix}]
- targetNotes: string，目标模型限制与注意事项

增强 LLM 的约束：只输出 JSON；prompt 必须是目标模型可直接用的语言与语法；不确定的参数不要编造，放到 gaps 或 targetNotes；不要输出 Markdown 代码围栏。

---

## 8. 存疑与待核实清单（插件 UI 应作为提示而非硬校验）

1. Midjourney：--ow 数值范围、--chaos 范围、--q 各档位、视频延展上限；V7 与 V8.2 的部分参数差异（V8.2 官方参数页未逐项列数值）。
2. SD3.5：官方参数页未取到，28 步/guidance 3.5/Turbo 4 步来自社区指南。
3. FLUX.1：BFL 文档重心已转向 FLUX 3/FLUX.2，FLUX.1 的 steps/guidance/safety_tolerance 取值待官方旧页确认。
4. GPT-Image：Azure 文档的尺寸/像素档位表在抓取时被截断；OpenAI 官方提示词指南被 403。
5. 豆包 Seedream：官方提示词指南正文由 JS 渲染，未取到参数表；5.0 是否存在及能力待核实。
6. 即梦：产品文档不公开底层参数；按 Seedream/Seedance 能力推断。
7. 可灵 Kling：Kling 2.5 旧版参数（cfg_scale/camera_control 取值）待核实；4.0 的提示词长度上限与负向字段待核实。
8. 海螺 Hailuo-02：分辨率档位（512P/768P/1080P）与 [命令] 完整列表未逐项取到官方原文。
9. Sora 2：官方指南被 403；时长（4/8/12s）与分辨率档位待核实。
10. Veo 3.1：官方指南抓取失败；对白 8 秒上限、JSON 提示词、4/6/8 秒来自社区整理。
11. Pika 2.2：官方提示词文档缺失，版本可能已更新。
12. Seedance 2.x / Seedream 4.5-5.0：官方页面存在但正文未抓取。
13. Vidu 视频参数：只核实了图像 API；视频时长/分辨率/参考能力待核实。
14. Wan 2.2：分辨率/帧数/CFG 精确值未从官方 README 之外确认。

---

## 9. 来源

【官方·已核实】

- Midjourney Parameter List: https://docs.midjourney.com/hc/en-us/articles/32859204029709-Parameter-List （updated 2026-09-01）
- Midjourney Version: https://docs.midjourney.com/hc/en-us/articles/32199405667853-Version
- Midjourney Aspect Ratio: https://docs.midjourney.com/hc/en-us/articles/31894244298125-Aspect-Ratio
- Midjourney Stylize: https://docs.midjourney.com/hc/en-us/articles/32196176868109-Stylize
- Midjourney Style Reference: https://docs.midjourney.com/hc/en-us/articles/32180011136653-Style-Reference
- Midjourney Omni Reference: https://docs.midjourney.com/hc/en-us/articles/36285124473997-Omni-Reference
- Midjourney Weird: https://docs.midjourney.com/hc/en-us/articles/32390120435085-Weird
- Midjourney Video: https://docs.midjourney.com/hc/en-us/articles/37460773864589-Video
- Midjourney Edit Model: https://docs.midjourney.com/hc/en-us/articles/48495453462797-Edit-Model
- FLUX Prompting Guide: https://docs.bfl.ai/guides/prompting_summary
- FLUX Technical Parameters: https://docs.bfl.ai/guides/prompting_unified_technical.md
- FLUX Video: https://docs.bfl.ai/guides/prompting_video_overview.md
- BFL 文档索引: https://docs.bfl.ai/llms.txt
- Azure OpenAI image generation models: https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/dall-e
- Kling 4.0 User Manual: https://kling.ai/document-api/api/usage-guide/kling-4-0
- Kling 4.0 Prompt Guide: https://kling.ai/document-api/api/usage-guide/kling-4-0-prompt-guide
- MiniMax Video Generation: https://platform.minimax.io/docs/guides/video-generation
- MiniMax H3 Feature Highlights: https://platform.minimax.io/docs/guides/video-prompt.md
- MiniMax T2V API（含 Hailuo-02）: https://platform.minimax.io/docs/api-reference/video-generation-t2v.md
- MiniMax First/Last Frame API: https://platform.minimax.io/docs/api-reference/video-generation-fl2v.md
- Runway Gen-4 Video Prompting Guide: https://help.runwayml.com/hc/en-us/articles/39789879462419-Gen-4-Video-Prompting-Guide
- Runway Gen-4 Image Prompting Guide: https://help.runwayml.com/hc/en-us/articles/35694045317139-Gen-4-Image-Prompting-Guide
- Seedance 1.0 官方页: https://seed.bytedance.com/en/seedance
- Vidu Image API (Alibaba Cloud): https://www.alibabacloud.com/help/en/model-studio/vidu-image-generation-api-reference （updated 2026-10-11）
- Wan2.2 GitHub: https://github.com/Wan-Video/Wan2.2
- Stable Diffusion web UI Features（权重语法）: https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Features

【官方·页面存在，正文未取到】

- Seedream 4.0-5.0 提示词指南: https://ark.volcengine.com/region:cn-beijing/docs/seedream-4-0-5-0-prompt-guide
- Seedance 1.0 pro 提示词指南: https://docs.byteplus.com/zh-CN/docs/ModelArk/seedance-1-0-pro-pro-fast
- Sora 2 官方提示词指南: https://developers.openai.com/cookbook/examples/sora/sora2_prompting_guide
- Veo 3.1 官方提示词指南: https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-veo-3-1
- Dreamina 即梦: https://dreamina.capcut.com/

【社区（用于交叉验证，非官方）】

- Sora 2 Prompting Guide 社区整理: https://raw.githubusercontent.com/het8802/opennolan/4457349c386ea1a89c01547f9a76fa650970c131/skills/creative/prompting/sora-prompting.md
- fal Sora 2 指南: https://fal.ai/learn/devs/how-to-write-prompts-sora-2 （2025-12-20）
- Veo 参考（社区）: https://raw.githubusercontent.com/smixs/visual-skills/HEAD/video/references/veo.md
- SD3.5 Prompt Guide（SceneWorks）: https://raw.githubusercontent.com/sceneworks/sceneworks/a1d95e2c43eef4a34a3fe5bf420bb2cc2abe181f/apps/web/public/prompt-guides/sd3-5.md
- Midjourney V7 新特性（社区）: https://raw.githubusercontent.com/Pixmind-io/awesome-midjourney-v7-example-prompts/main/guide/v7-new-features.md

---

## 10. 给插件实现层的建议

1. 目标选择器按 kind 分组（图像/视频/文本），豆包作为独立 target（label 明确"豆包 Seedream（图片）"）。
2. 增强 LLM 的 system prompt 注入：target 的 syntaxRules/paramHints/do/dont + rubric + outputSchema；不要注入全部 styles，按用户选择或 top-3 注入。
3. params 面板按 target.paramHints 动态渲染；标 confidence=low 的参数显示"建议值/待核实"。
4. 语言提示：target.languageHint 为 "en" 时自动把草稿转英文；"zh" 保留中文；"both" 由用户语言决定。
5. 评分展示：总分 + 每维进度条 + gaps 修复建议；不要伪造精确性——无法核实的参数在 UI 标注"建议值"。
6. 版本更新策略：presets.json.version 与 updatedAt 展示在设置页；sources 保留 URL 便于人工复核。
