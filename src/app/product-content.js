export const VIEW_STEP = {
  home: 0,
  theory: 0,
  question: 1,
  result: 2,
  share: 3,
  history: 3,
};

export const UI_COPY = {
  header: {
    theory: "抗蒸小记",
    start: "开始测试",
    share: "分享结果",
  },
  steps: ["准备开始", "补充场景", "开始答题", "查看结果"],
  quizMenu: {
    current: "继续答题",
    instructions: "答题须知",
    theory: "抗蒸小记",
    restart: "退出重测",
  },
  resultSections: {
    label: "判断底色",
    portrait: "结果小传",
    role: "工作映照",
    dimensions: "六维侧影",
    interpretation: "结果解读",
    share: "分享文案",
  },
};

export const RESULT_DETAIL_TITLES = {
  label: ["翻成人话", "为什么像你", "最容易被误会的地方", "下一步不用大改", "这次露出的线索", "顺手说一句"],
  dimension: ["翻成人话", "为什么会这样", "最容易被误会的地方", "下一步不用大改", "这次露出的线索"],
};

export const THEORY_COPY = {
  title: "有些东西，蒸不走",
  subtitle: "一页说清：什么是抗蒸性",
  distillation: {
    title: "一、蒸馏之后",
    paragraphs: [
      "一件事做久了，总能理出步骤：先做什么，后做什么，哪里容易错。它们适合写进流程，也适合交给 AI。",
      "可真正难交接的，往往发生在纸面之外。对方那句“都可以”到底是不在意，还是不方便反对；这次该守规矩，还是该为一个例外停下来。那些没有现成答案的片刻，就是这里所说的抗蒸性。",
    ],
  },
  layers: {
    title: "二、三层功夫",
    items: [
      ["责任层", "接住后果"],
      ["判断层", "作出取舍"],
      ["行为层", "完成动作"],
    ],
    body: "动作最容易教，取舍难一些，后果则不能代签。AI 可以写出漂亮答案，流程也能让多数事情不出错；到了“这次是否例外”“出了事谁来承担”，人仍得在场。",
  },
  dimensionsTitle: "三、六面见人",
  handOff: {
    title: "四、放手之物",
    paragraphs: [
      "重复、整理、初稿，能交出去就交出去。人没有必要用疲惫证明自己。",
      "真正值得留意的，是交出去以后你还在做什么：挑方向、看气氛、判边界，还是只剩下按下确认键。",
    ],
  },
  holdOn: {
    title: "五、留手之物",
    paragraphs: [
      "别急着追求“难以替代”。难替代有时只是流程没写好，或者事情全压在一个人身上。",
      "更稳妥的标准是：你的判断有来处，讲得出条件，也愿意接住后果。它可以被别人学习，却不会一写成三条原则就走样。",
    ],
  },
  note: "这份测试只供自我观察。它不替招聘做决定，也不替医生或心理咨询师说话。",
};

export const QUESTION_GUIDES = {
  instructions: {
    title: "答题须知",
    subtitle: "照平时的反应来，不替理想中的自己作答",
    sections: [
      ["凭心作答", "每题挑最像你平时反应的一项。这里没有标准答案，也不必猜哪个选项显得更厉害。"],
      ["可以回头", "点“上一题”就能改。换了答案，后面的题也会顺着新的方向继续。"],
      ["题随人走", "题目会追着还没看清的地方问。同一个人换个状态再测，也可能走出另一条路。"],
    ],
  },
  theory: {
    title: "抗蒸小记",
    subtitle: "能写进流程的是方法，留在现场的是判断",
    sections: [
      ["何为抗蒸", "把工作写成流程、插件、Skill 或提示词以后，总有些判断没有一起被写进去。抗蒸性看的，就是剩下的这一部分。"],
      ["六面见人", "测试从情境、边界、重构、审美、取舍和经验六面照一照。它们不是六门功课，只是六种看人的角度。"],
      ["分数何意", "含活人量不排好坏。高一些，说明更多判断依赖现场；低一些，说明方法更容易复用。值得看的，是你愿意交出什么，又想留下什么。"],
    ],
  },
};

export const DIMENSION_DETAILS = {
  CXT: {
    name: "情境",
    subtitle: "听懂未出口的话",
    color: "#7b65d0",
    assetKey: "context_reader",
    meaning: "你会不会把人、关系、时机和真正目标一起放进判断里，而不是只听字面意思。",
    evidence: "这项较高时，你往往会先确认语境，留意谁在承担风险，再追问事情真正要解决什么。",
    misunderstanding: "这不是揣摩领导，也不是八面玲珑。它只是提醒你：同一句话，换个场合可能完全不是一回事。",
    growth: "下次做决定前，多问一句：这里还有谁没开口？现在真的是合适的时机吗？",
  },
  BND: {
    name: "边界",
    subtitle: "看见规则的尽头",
    color: "#5f8fd8",
    assetKey: "boundary_radar",
    meaning: "你能不能看出流程、模板、AI 输出或旧经验在哪儿会失效，并及时把判断接回来。",
    evidence: "这项较高时，你会主动说明适用条件、例外和后果，也更愿意备一条替代路线。",
    misunderstanding: "这不是保守，更不是和效率过不去。你只是对“高效地做错事”比较没耐心。",
    growth: "遇到顺手的方法时，顺便问一句：它在哪种情况下会突然不灵？",
  },
  GEN: {
    name: "重构",
    subtitle: "把问错的题重问",
    color: "#6fc3bc",
    assetKey: "generative_reframer",
    meaning: "你会不会在埋头作答前，先确认这个问题问得对不对，再把空需求改成能动手的任务。",
    evidence: "这项较高时，你常会重写目标、删掉噪声、换条路径，或先做个小样验证方向。",
    misunderstanding: "这不等于点子多，也不只是会写 prompt。真正的本事，是发现大家可能一直在答错题。",
    growth: "接到模糊任务时，先别急着交答案：如果只能改一个前提，你会改哪个？",
  },
  TST: {
    name: "审美",
    subtitle: "分清漂亮与真实",
    color: "#f0a25f",
    assetKey: "empty_professional_detector",
    meaning: "你能不能越过完整框架和专业术语，看见里面有没有真判断、真取舍。",
    evidence: "这项较高时，你通常能指出哪里空、哪里包装过头、哪里根本没对上对象。",
    misunderstanding: "这不是挑刺或审美洁癖。你只是很难被“看起来挺专业”这句话轻易打发。",
    growth: "看见一个很完整的方案时，试着找出：它认真放弃了什么？",
  },
  STN: {
    name: "取舍",
    subtitle: "知道什么不能换",
    color: "#de6f91",
    assetKey: "value_low_generation",
    meaning: "你知不知道哪些东西不能拿去换效率、短期收益或表面上的一路顺利。",
    evidence: "这项较高时，你会说清代价由谁承担，也会在拒绝之外给出能继续往前走的办法。",
    misunderstanding: "这不是摆姿态，也不只是会说“不行”。真正的底线，最后都会变成一条能执行的边界。",
    growth: "下次准备让一步时，先确认：我让掉的是偏好，还是以后会后悔的东西？",
  },
  GRD: {
    name: "经验",
    subtitle: "让经历长成眼力",
    color: "#84bd8d",
    assetKey: "grounded_experience",
    meaning: "你的判断有没有真实经历托底，并且经得起失败、反例和新情况不断修正。",
    evidence: "这项较高时，你通常说得出直觉从哪儿来、在什么条件下成立，也知道它会在哪儿失灵。",
    misunderstanding: "这不看工龄，也不鼓励“我吃过的盐比你多”。经验只有能迁移、能更新，才真正算数。",
    growth: "下次冒出强烈直觉时，追问一句：它在提醒我什么，又可能把我带偏什么？",
  },
};

export const ROLE_FIELDS = [
  {
    name: "taskShape",
    title: "1. 你现在主要做哪类工作？",
    icon: "briefcase",
    options: [
      ["routine", "产品 / 设计"],
      ["ruleException", "研发 / 技术"],
      ["coordination", "运营 / 增长"],
      ["direction", "市场 / 品牌"],
      ["direction", "管理 / 战略"],
      ["ruleException", "其他"],
    ],
  },
  {
    name: "aiExposure",
    title: "2. 你的日常更接近哪一种？",
    icon: "people",
    options: [
      ["standard", "执行与落地"],
      ["partial", "判断与决策"],
      ["draft", "创意与产出"],
      ["guarded", "策略与规划"],
      ["partial", "支持与协同"],
      ["guarded", "几种都有"],
    ],
  },
  {
    name: "sopHardPart",
    title: "3. 你的工作环境变化多吗？",
    icon: "sliders",
    options: [
      ["trust", "每天都在变"],
      ["exceptions", "经常有变化"],
      ["efficiency", "整体较稳定"],
      ["taste", "按周期变化"],
    ],
  },
];
