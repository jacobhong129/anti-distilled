export const VIEW_STEP = {
  home: 0,
  theory: 0,
  work: 1,
  question: 2,
  result: 3,
};

export const QUESTION_GUIDES = {
  instructions: {
    title: "怎么答更准",
    subtitle: "别替理想中的自己答，按平时的反应来",
    sections: [
      ["怎么选", "每题挑最像你平时反应的一项。这里没有标准答案，也不用琢磨哪个选项显得更厉害。"],
      ["选错了怎么办", "点“上一题”就能改。改完以后，后面的题会顺着新答案继续问。"],
      ["为什么每次题目不一样", "系统会追问还没看清的地方。不同的人，甚至同一个人重测，走到的题目都可能不完全相同。"],
    ],
  },
  theory: {
    title: "什么是抗蒸性",
    subtitle: "看看哪些本事能教会，哪些还得你本人在场",
    sections: [
      ["先说清楚", "抗蒸性不反 AI，也不奖励低效率。它关心的是：当工作被写成流程、插件、Skill 或提示词以后，还有多少判断必须由你来做。"],
      ["它会看哪里", "测试会从情境、边界、重构、审美、取舍和经验六个角度看你的判断习惯。分数越高，通常越难只靠一套流程复刻。"],
      ["分数怎么读", "含活人量没有好坏排名。高分更依赖现场判断，低分更擅长稳定复用；真正值得看的，是你把什么交给工具，又把什么留在手里。"],
    ],
  },
};

export const DIMENSION_DETAILS = {
  CXT: {
    name: "情境判断",
    subtitle: "听见说出口的话，也看见没说出口的事",
    color: "#7b65d0",
    assetKey: "context_reader",
    meaning: "你会不会把人、关系、时机和真正目标一起放进判断里，而不是只听字面意思。",
    evidence: "这项较高时，你往往会先确认语境，留意谁在承担风险，再追问事情真正要解决什么。",
    misunderstanding: "这不是揣摩领导，也不是八面玲珑。它只是提醒你：同一句话，换个场合可能完全不是一回事。",
    growth: "下次做决定前，多问一句：这里还有谁没开口？现在真的是合适的时机吗？",
  },
  BND: {
    name: "边界判断",
    subtitle: "知道什么时候照章办，什么时候先停一下",
    color: "#5f8fd8",
    assetKey: "boundary_radar",
    meaning: "你能不能看出流程、模板、AI 输出或旧经验在哪儿会失效，并及时把判断接回来。",
    evidence: "这项较高时，你会主动说明适用条件、例外和后果，也更愿意备一条替代路线。",
    misunderstanding: "这不是保守，更不是和效率过不去。你只是对“高效地做错事”比较没耐心。",
    growth: "遇到顺手的方法时，顺便问一句：它在哪种情况下会突然不灵？",
  },
  GEN: {
    name: "问题重构",
    subtitle: "原题不对时，敢把问题重新问一遍",
    color: "#6fc3bc",
    assetKey: "generative_reframer",
    meaning: "你会不会在埋头作答前，先确认这个问题问得对不对，再把空需求改成能动手的任务。",
    evidence: "这项较高时，你常会重写目标、删掉噪声、换条路径，或先做个小样验证方向。",
    misunderstanding: "这不等于点子多，也不只是会写 prompt。真正的本事，是发现大家可能一直在答错题。",
    growth: "接到模糊任务时，先别急着交答案：如果只能改一个前提，你会改哪个？",
  },
  TST: {
    name: "审美判断",
    subtitle: "漂亮话过眼，真东西才留下",
    color: "#f0a25f",
    assetKey: "empty_professional_detector",
    meaning: "你能不能越过完整框架和专业术语，看见里面有没有真判断、真取舍。",
    evidence: "这项较高时，你通常能指出哪里空、哪里包装过头、哪里根本没对上对象。",
    misunderstanding: "这不是挑刺或审美洁癖。你只是很难被“看起来挺专业”这句话轻易打发。",
    growth: "看见一个很完整的方案时，试着找出：它认真放弃了什么？",
  },
  STN: {
    name: "价值取舍",
    subtitle: "有底线，也能把底线落到做法里",
    color: "#de6f91",
    assetKey: "value_low_generation",
    meaning: "你知不知道哪些东西不能拿去换效率、短期收益或表面上的一路顺利。",
    evidence: "这项较高时，你会说清代价由谁承担，也会在拒绝之外给出能继续往前走的办法。",
    misunderstanding: "这不是摆姿态，也不只是会说“不行”。真正的底线，最后都会变成一条能执行的边界。",
    growth: "下次准备让一步时，先确认：我让掉的是偏好，还是以后会后悔的东西？",
  },
  GRD: {
    name: "经验内化",
    subtitle: "吃过的亏，有没有长成下次的眼力",
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
