export const VIEW_STEP = {
  home: 0,
  theory: 0,
  work: 1,
  question: 2,
  result: 3,
};

export const QUESTION_GUIDES = {
  instructions: {
    title: "测试说明",
    subtitle: "按最接近你真实反应的方式选择",
    sections: [
      ["怎么答", "每道题只需要选择最接近你平时反应的一项，不需要猜哪个选项更高级。测试看的是判断方式，不是标准答案。"],
      ["能不能返回", "可以使用“上一题”修改刚才的选择。回退后重新选择，会按新的路径继续动态出题。"],
      ["为什么题目会变化", "题目会根据前面的选择继续追问不确定的地方，所以不同人、不同次测试遇到的题目可能不完全一样。"],
    ],
  },
  theory: {
    title: "什么是抗蒸性",
    subtitle: "人在 AI 时代不容易被完整复制的判断习惯",
    sections: [
      ["不是反 AI", "抗蒸性不是反对 AI，也不是拒绝效率。它关注的是：当工作被流程、插件、Skill 或提示词复制时，你还剩下多少不容易复制的人味。"],
      ["它看什么", "这套测试主要观察情境判断、边界判断、问题重构、审美判别、价值定向和经验内化。分数越高，通常意味着你的判断更难被简单流程化。"],
      ["结果怎么理解", "含活人量不是好坏评判。高分说明你更依赖现场判断和复杂取舍；低分说明你的工作方式更容易被标准化、工具化或流程化。"],
    ],
  },
};

export const DIMENSION_DETAILS = {
  CXT: {
    name: "情境判断",
    subtitle: "看你能不能读懂话外音和现场感",
    color: "#7b65d0",
    assetKey: "context_reader",
    meaning: "你能不能读出场景里真正起作用的人、关系、时机和真实目标。",
    evidence: "高分通常来自能确认语境、看见风险关系、追问真实目标的选择。",
    misunderstanding: "它不是“会做人”或“会猜老板”，而是知道一个方法在什么场景下才算数。",
    growth: "可以反问自己：我刚才判断时，看见了哪些别人可能忽略的人、时机和关系。",
  },
  BND: {
    name: "边界判断",
    subtitle: "看你知不知道哪里不能硬套",
    color: "#5f8fd8",
    assetKey: "boundary_radar",
    meaning: "你能不能看出流程、模板、AI 输出、旧经验什么时候会失效，什么时候需要人停下来判断。",
    evidence: "高分常见于能提出条件、边界、替代方案和后果判断的选择。",
    misunderstanding: "它不是保守，也不是反效率，而是不让工具在错误地方高效犯错。",
    growth: "可以反问自己：这个方法在哪些条件下会失效，什么时候必须停下来重新看。",
  },
  GEN: {
    name: "问题重构",
    subtitle: "看你能不能把题目改对",
    color: "#6fc3bc",
    assetKey: "generative_reframer",
    meaning: "你不是只完成原题，而是能把空泛任务改成更值得做、更可执行的问题。",
    evidence: "高分来自能重写目标、清理噪声、调整路径、提出可测试方案的选择。",
    misunderstanding: "它不是点子多，也不是会写 prompt，而是知道原题哪里不对。",
    growth: "可以反问自己：我是在回答原题，还是已经看见了真正该解决的问题。",
  },
  TST: {
    name: "审美判断",
    subtitle: "看你能不能识别假精致和空话",
    color: "#f0a25f",
    assetKey: "empty_professional_detector",
    meaning: "你能不能看出漂亮表达、完整框架、专业术语背后有没有真实取舍。",
    evidence: "高分通常会指出哪里空、哪里过度包装、哪里与对象不匹配。",
    misunderstanding: "它不是挑剔，也不是审美洁癖，而是对“看起来专业但没有判断”的免疫力。",
    growth: "可以反问自己：这个看起来完整的方案，真正做了哪些取舍，又躲开了哪些判断。",
  },
  STN: {
    name: "价值取舍",
    subtitle: "看你能不能把底线变成做法",
    color: "#de6f91",
    assetKey: "value_low_generation",
    meaning: "你知道哪些东西不能为了效率、短期收益或表面顺利被牺牲。",
    evidence: "高分来自能说明代价、责任、底线，并给出更可执行替代方案的选择。",
    misunderstanding: "它不是摆姿态，也不是只会说“不行”，而是能把底线变成可执行的边界。",
    growth: "可以反问自己：如果为了效率、顺滑或短期收益做让步，我最不愿牺牲的是什么。",
  },
  GRD: {
    name: "经验内化",
    subtitle: "看你的经验有没有真的长成判断",
    color: "#84bd8d",
    assetKey: "grounded_experience",
    meaning: "你的判断是否来自真实案例、失败经验、长期观察和不断修正。",
    evidence: "高分常见于能说出经验来源、适用条件、失败边界和更新方式的选择。",
    misunderstanding: "它不是资历久，也不是凭感觉，而是经验已经变成可用的判断。",
    growth: "可以反问自己：这个直觉来自哪次经验，它在什么场景成立，又在哪些场景可能误导我。",
  },
};

export const ROLE_FIELDS = [
  {
    name: "taskShape",
    title: "1. 你的主要工作领域是？",
    icon: "briefcase",
    options: [
      ["routine", "产品/设计"],
      ["ruleException", "研发/技术"],
      ["coordination", "运营/增长"],
      ["direction", "市场/品牌"],
      ["direction", "管理/战略"],
      ["ruleException", "其他"],
    ],
  },
  {
    name: "aiExposure",
    title: "2. 你的工作更接近？",
    icon: "people",
    options: [
      ["standard", "执行落地"],
      ["partial", "判断决策"],
      ["draft", "创意生成"],
      ["guarded", "策略规划"],
      ["partial", "支持协同"],
      ["guarded", "多种兼具"],
    ],
  },
  {
    name: "sopHardPart",
    title: "3. 你的工作环境节奏是？",
    icon: "sliders",
    options: [
      ["trust", "高度变化"],
      ["exceptions", "中等变化"],
      ["efficiency", "相对稳定"],
      ["taste", "周期性变化"],
    ],
  },
];
