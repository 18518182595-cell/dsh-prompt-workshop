/** dsh-prompt-workshop — prompt building, parsing, normalization, and local review.
 * Pure functions only: no DSH services and no I/O, so the whole module is
 * unit-testable with plain node --test.
 */
import { rubric } from './presets.js'

const JSON_CONTRACT = {
  prompt: '最终提示词：可直接粘贴进目标生成器，包含该模型要求的语法与参数',
  negativePrompt: '负向提示词；目标模型不支持时留空字符串',
  params: '参数建议对象，如 {"aspectRatio":"16:9","duration":"5s"}',
  variations: '2-4 个同主题的变体提示词（纯字符串数组）',
  explanation: '中文说明：改写思路与关键改动，2-4 句',
  score: '自评 0-100 的整数',
  gaps: '仍建议用户补充的信息（字符串数组，可为空）',
  targetNotes: '针对该目标模型的注意事项，1-2 句',
}

function bullet(lines) {
  return (lines || []).filter(Boolean).map((line) => '- ' + line).join('\\n')
}

function dimensionChecklist() {
  return rubric().dimensions.map((d) => '- ' + d.label + '（' + d.desc + '）').join('\\n')
}

function languageRule(target, language) {
  const hint = String((target && target.languageHint) || 'auto')
  const chosen = String(language || 'auto')
  if (chosen === 'zh') return '提示词本体使用简体中文（专有名词/参数语法可保留英文）。'
  if (chosen === 'en') return '提示词本体使用英文，描述具体、短句为主。'
  if (hint === 'zh') return '该目标模型中文原生，提示词本体使用简体中文。'
  if (hint === 'en') return '该目标模型对英文更稳定，提示词本体使用英文。'
  return '按目标模型习惯选择中文或英文（同一段内不要混杂两种语言）。'
}

/** Build the single user message that asks the enhancer model for a precise prompt. */
export function buildEnhanceRequest(options) {
  const input = String((options && options.input) || '').trim()
  const target = options && options.target
  const taskType = options && options.taskType
  const style = options && options.style
  const variants = Math.max(1, Math.min(5, Number((options && options.variants) || 3)))
  const language = (options && options.language) || 'auto'
  const extra = String((options && options.extra) || '').trim()

  const targetBlock = target
    ? [
        '名称：' + target.label + '（' + (target.vendor || '通用') + '，类型：' + target.kind + '）',
        '该目标模型的语法与参数规则：',
        bullet(target.syntaxRules),
        '参数建议：' + JSON.stringify(target.paramHints || {}),
        '应做：' + bullet(target['do']),
        '避免：' + bullet(target['dont']),
        target.examplePrompt ? '示例提示词：' + target.examplePrompt : '',
        target.negativeHint ? '负向提示词提示：' + target.negativeHint : '',
        target.notes ? '注意事项：' + target.notes : '',
      ].filter(Boolean).join('\\n')
    : '未指定目标模型：按通用设计原则输出。'

  const taskBlock = taskType
    ? taskType.label + '：' + (taskType.desc || '') + '（kind=' + taskType.kind + '）'
    : '通用任务'

  const styleBlock = style
    ? style.label + '：' + style.fragment
    : '无额外风格要求'

  const parts = [
    '你是世界级的提示词工程师，擅长把用户模糊、口语化的想法，改写成目标生成模型可以直接使用的精准提示词。',
    '',
    '## 任务',
    '把下面的【用户原始想法】改写成【目标模型】可用的提示词。不要向用户提问；信息不足时按行业惯例做最合理假设，并把假设放入 gaps。',
    '',
    '## 目标模型',
    targetBlock,
    '',
    '## 任务类型',
    taskBlock,
    '',
    '## 风格要求',
    styleBlock,
    '',
    '## 输出语言',
    languageRule(target, language),
    '解释、gaps、targetNotes 一律使用简体中文。',
    '',
    '## 质量检查清单（改写时逐项覆盖）',
    dimensionChecklist(),
    '',
    '## 用户原始想法',
    input || '（用户没有提供文字，请基于任务类型给出一个可直接使用的完整示例提示词，并在 gaps 说明需要用户补充什么）',
  ]
  if (extra) parts.push('', '## 用户附加要求', extra)
  parts.push(
    '',
    '## 输出格式',
    '严格输出一个 JSON 对象，不要 Markdown 代码块，不要任何 JSON 之外的文字。字段如下：',
    JSON.stringify(JSON_CONTRACT, null, 0),
    '要求：variations 恰好 ' + variants + ' 条；score 为 0-100 整数；字符串内不要出现未转义的换行（用空格代替）。',
    '',
    '## 硬性约束',
    '- 保持用户原意，不引入用户未要求的品牌、真人明星或受版权保护角色。',
    '- 不要输出解释性前后缀，JSON 之外一个字都不要有。',
    '- prompt 必须包含目标模型要求的参数语法（如果该模型有参数语法）。',
  )
  return parts.join('\\n')
}

/** Build a review/score request for an existing prompt. */
export function buildScoreRequest(options) {
  const prompt = String((options && options.prompt) || '').trim()
  const target = options && options.target
  const negative = String((options && options.negativePrompt) || '').trim()
  const parts = [
    '你是严格的提示词质检员。请依据目标生成模型规范，对给定提示词做评分与缺口分析。',
    '',
    '## 目标模型',
    target ? [target.label + '（' + (target.vendor || '') + '，类型：' + target.kind + '）', '语法规则：', bullet(target.syntaxRules)].join('\\n') : '通用目标',
    '',
    '## 评分维度',
    dimensionChecklist(),
    '',
    '## 待评分提示词',
    prompt,
  ]
  if (negative) parts.push('', '## 当前负向提示词', negative)
  parts.push(
    '',
    '## 输出格式',
    '严格输出 JSON（不要 Markdown 代码块）：',
    '{"score":0-100整数,"dimensions":[{"id":"维度id","label":"中文名","score":0-100,"comment":"一句中文点评"}],"gaps":["缺口1"],"suggestions":["改进建议1"],"rewrittenPrompt":"改进后的完整提示词"}',
    '',
    '硬性约束：不提问、只输出 JSON、解释与建议用简体中文。',
  )
  return parts.join('\\n')
}

/** Build a request that reverse-engineers a target-ready prompt from an image. */
export function buildReverseRequest(options) {
  const target = options && options.target
  const language = (options && options.language) || 'auto'
  const extra = String((options && options.extra) || '').trim()
  const variants = Math.max(1, Math.min(5, Number((options && options.variants) || 3)))
  const targetBlock = target
    ? [
        '名称：' + target.label + '（' + (target.vendor || '通用') + '，类型：' + target.kind + '）',
        '该目标模型的语法与参数规则：',
        bullet(target.syntaxRules),
        '参数建议：' + JSON.stringify(target.paramHints || {}),
        '应做：' + bullet(target['do']),
        '避免：' + bullet(target['dont']),
        target.examplePrompt ? '示例提示词：' + target.examplePrompt : '',
      ].filter(Boolean).join('\n')
    : '未指定目标模型：按通用设计原则输出。'
  const parts = [
    '你是资深的视觉提示词反推专家。用户给定一张参考图，请先仔细看图，再反推出“能在目标模型里复现这张图”的精准提示词。',
    '',
    '## 目标模型',
    targetBlock,
    '',
    '## 观察要求（按顺序覆盖）',
    '1. 主体：是什么、数量、外观、材质、动作/状态、表情；',
    '2. 场景与环境：地点、时间、天气、背景元素；',
    '3. 构图与镜头：景别、机位/视角、主体位置、留白、焦段、景深；',
    '4. 光线与色彩：光源方向、软硬、色温、主色调、对比度、氛围；',
    '5. 风格与媒介：摄影/插画/3D/动漫/胶片等，参考风格锚点；',
    '6. 细节与质感：材质纹理、表面细节、画面颗粒/画质；',
    '7. 画面文字：如果图中有文字，精确写出文字内容、字体风格与位置；',
    '8. 视频类目标：如果目标模型是视频模型，说明画面可能的运动、镜头运动与节奏（基于单帧合理推测）。',
    '',
    '## 输出语言',
    languageRule(target, language),
    '解释、gaps、targetNotes 一律使用简体中文。',
    '',
    '## 输出格式',
    '严格输出一个 JSON 对象，不要 Markdown 代码块，不要任何 JSON 之外的文字。字段如下：',
    JSON.stringify(JSON_CONTRACT, null, 0),
    '要求：variations 恰好 ' + variants + ' 条（每条都是同一张图的不同风格/细节侧重版本）；score 为 0-100 整数；字符串内不要出现未转义换行。',
    '',
    '## 硬性约束',
    '- 只描述图中真实可见的内容，不要编造图中不存在的元素；看不清的细节在 gaps 中说明。',
    '- 不要输出 JSON 之外的任何文字。',
    '- prompt 必须包含目标模型要求的参数语法（如果该模型有参数语法）。',
  ]
  if (extra) parts.push('', '## 用户附加要求', extra)
  return parts.join('\n')
}

/** Extract the first JSON object from model output (tolerates fences and prose). */
export function parseJsonLoose(text) {
  const raw = String(text || '').trim()
  if (!raw) return null
  const candidates = []
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw)
  if (fence) candidates.push(fence[1])
  candidates.push(raw)
  const first = raw.indexOf('{')
  const last = raw.lastIndexOf('}')
  if (first >= 0 && last > first) candidates.push(raw.slice(first, last + 1))
  for (const candidate of candidates) {
    const trimmed = candidate.trim()
    try {
      const value = JSON.parse(trimmed)
      if (value && typeof value === 'object' && !Array.isArray(value)) return value
    } catch { /* try next */ }
  }
  return null
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringArray(value, limit) {
  if (!Array.isArray(value)) return []
  return value.map((item) => typeof item === 'string' ? item.trim() : '').filter(Boolean).slice(0, limit)
}

/** Normalize arbitrary model output into the plugin's result shape. */
export function normalizeResult(parsed, options) {
  const target = options && options.target
  const rawText = String((options && options.rawText) || '').trim()
  const variants = Math.max(1, Math.min(5, Number((options && options.variants) || 3)))
  if (!parsed) {
    const prompt = rawText.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '').trim()
    const review = reviewPromptText(prompt, target)
    return {
      prompt,
      negativePrompt: '',
      params: {},
      variations: [],
      explanation: '模型返回的不是 JSON，已按纯文本处理。',
      score: review.score,
      gaps: review.gaps,
      targetNotes: '',
      parseWarning: 'non-json',
    }
  }
  const prompt = asString(parsed.prompt) || rawText
  const result = {
    prompt,
    negativePrompt: asString(parsed.negativePrompt || parsed.negative_prompt),
    params: parsed.params && typeof parsed.params === 'object' && !Array.isArray(parsed.params) ? parsed.params : {},
    variations: asStringArray(parsed.variations, variants + 2),
    explanation: asString(parsed.explanation),
    score: Number.isFinite(Number(parsed.score)) ? Math.max(0, Math.min(100, Math.round(Number(parsed.score)))) : null,
    gaps: asStringArray(parsed.gaps, 8),
    targetNotes: asString(parsed.targetNotes || parsed.target_notes),
  }
  if (result.variations.length === 0) result.variations = []
  return result
}

const DIMENSION_PATTERNS = {
  subjectDetail: [/主体/, /人物/, /角色/, /女孩/, /男子/, /女子/, /一只/, /portrait of/i, /a (?:man|woman|girl|boy|child|person|figure)/i, /(?:astronaut|robot|creature|animal|bird|fox|cat|dog|warrior|knight|scientist|detective|chef|girl|boy)\b/i, /(?:texture|detail|grain|skin|fabric|wood|metal|glass|stone|clay|材质|纹理|质感|细节)\b/i],
  compositionCamera: [/构图/, /特写/, /近景/, /中景/, /远景/, /广角/, /竖版/, /横版/, /留白/, /镜头/, /焦段/, /mm\b/, /推近/, /拉远/, /跟随/, /环绕/, /运镜/, /(?:composition|wide shot|close-up|medium shot|top-down|bird.s-eye|low angle|high angle|negative space|lens|camera|dolly|panning|handheld|aerial|tilt|tracking|zoom)\b/i, /16:9|9:16|1:1|21:9/],
  lightingColor: [/光/, /逆光/, /侧光/, /顶光/, /晨光/, /黄昏/, /氛围/, /色调/, /色彩/, /冷色/, /暖色/, /配色/, /(?:lighting|light|lit|glow|sunset|sunrise|golden hour|backlit|neon|shadow|chiaroscuro|rim light)\b/i, /(?:color|palette|tone|teal|warm|muted|monochrome|pastel|contrast)\b/i],
  styleCoherence: [/风格/, /电影感/, /插画/, /动漫/, /写实/, /油画/, /水彩/, /(?:style|cinematic|anime|illustration|photorealistic|oil painting|watercolor|3d render|film noir|claymation|pixel art)\b/i],
  motionTemporal: [/动作/, /慢动作/, /运动/, /节奏/, /转场/, /(?:motion|movement|slow motion|action|pacing|transition|animation)\b/i],
  audioDialogue: [/对白/, /台词/, /音效/, /环境音/, /(?:dialogue|audio|sound|sfx|ambient|music)\b/i],
  technicalParams: [/--ar/, /--v\b/, /--stylize/, /--chaos/, /16:9/, /9:16/, /1:1/, /21:9/, /分辨率/, /时长/, /秒/, /(?:steps|cfg|aspect ratio|guidance|seconds|duration|resolution)\b/i],
  languageSyntax: [/[A-Za-z]{3,}/, /[\u4e00-\u9fff]/],
  safetyIP: [/(?:copyright|disney|marvel|pixar|nintendo|pokemon|mario|studio ghibli|版权|侵权|商标|迪士尼|宫崎骏|宝可梦|奥特曼)/i, /(?:明星|真人|名人|肖像权|网红)/],
}

/** Local keyword review used when no model is available (or as a sanity layer). */
export function reviewPromptText(prompt, target) {
  const text = String(prompt || '')
  const dimensions = rubric().dimensions
  const kind = target && target.kind ? target.kind : 'text'
  const applicable = dimensions.filter((dim) => {
    if (dim.id === 'motionTemporal') return kind === 'video'
    if (dim.id === 'audioDialogue') return false
    return true
  })
  let totalWeight = 0
  let gained = 0
  const gaps = []
  const dimensionScores = []
  for (const dim of applicable) {
    let level = 0
    if (dim.id === 'intentClarity') {
      const length = text.trim().length
      level = length >= 24 ? 1 : length >= 10 ? 0.7 : length > 0 ? 0.3 : 0
    } else if (dim.id === 'languageSyntax') {
      const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length
      const latin = (text.match(/[A-Za-z]/g) || []).length
      const hint = target && target.languageHint ? target.languageHint : 'auto'
      if (hint === 'en') level = cjk === 0 && latin > 0 ? 1 : latin > cjk * 3 ? 0.7 : 0.2
      else if (hint === 'zh') level = cjk > 0 ? (latin > cjk ? 0.7 : 1) : 0.3
      else level = cjk > 0 || latin > 0 ? 1 : 0
    } else if (dim.id === 'technicalParams') {
      const rules = ((target && target.syntaxRules) || []).join(' ').toLowerCase()
      const expectsParams = /--ar|--v\b|--stylize|--sref|cfg|steps/.test(rules)
      const hasParams = /--ar|--v\b|--stylize|--sref|--no|cfg|steps|aspect ratio|resolution|seconds\b|--motion/.test(text.toLowerCase())
      level = expectsParams ? (hasParams ? 1 : 0) : (hasParams ? 1 : 0.4)
    } else if (dim.id === 'safetyIP') {
      const patterns = DIMENSION_PATTERNS.safetyIP
      const risky = patterns.some((pattern) => pattern.test(text))
      level = risky ? 0.3 : 1
    } else {
      const patterns = DIMENSION_PATTERNS[dim.id] || []
      let hits = 0
      for (const pattern of patterns) if (pattern.test(text)) hits += 1
      level = hits >= 2 ? 1 : hits === 1 ? 0.7 : 0
    }
    totalWeight += dim.weight
    gained += dim.weight * level
    dimensionScores.push({
      id: dim.id,
      label: dim.label,
      score: Math.round(level * 100),
      comment: level >= 1 ? '已覆盖' : level > 0 ? '部分覆盖，可更具体' : '缺少，建议补充',
    })
    if (level < 0.6) gaps.push(dim.label + '：' + (dim.desc || '信息不足'))
  }
  const score = totalWeight > 0 ? Math.max(0, Math.min(100, Math.round((gained / totalWeight) * 100))) : 0
  return { score, dimensions: dimensionScores, gaps: gaps.slice(0, 8) }
}

/** Format a normalized enhancement result as readable tool output. */
export function formatResultForTool(result, target, enhancerLabel) {
  const lines = []
  lines.push('【目标】' + (target ? target.label : '通用'))
  if (enhancerLabel) lines.push('【增强模型】' + enhancerLabel)
  lines.push('')
  lines.push('【提示词】')
  lines.push(result.prompt || '（空）')
  if (result.negativePrompt) {
    lines.push('')
    lines.push('【负向提示词】')
    lines.push(result.negativePrompt)
  }
  const params = result.params && Object.keys(result.params).length > 0 ? result.params : null
  if (params) {
    lines.push('')
    lines.push('【参数建议】')
    for (const [key, value] of Object.entries(params)) lines.push('- ' + key + '：' + value)
  }
  if (result.variations && result.variations.length > 0) {
    lines.push('')
    lines.push('【变体】')
    result.variations.forEach((variation, index) => lines.push((index + 1) + '. ' + variation))
  }
  if (result.explanation) {
    lines.push('')
    lines.push('【说明】' + result.explanation)
  }
  if (typeof result.score === 'number') {
    lines.push('')
    lines.push('【自评】' + result.score + '/100' + (result.gaps && result.gaps.length ? '；待补充：' + result.gaps.join('；') : ''))
  }
  if (result.targetNotes) {
    lines.push('')
    lines.push('【目标模型注意】' + result.targetNotes)
  }
  return lines.join('\\n')
}
