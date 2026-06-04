const dims = ["context", "boundary", "generative", "taste", "stance", "groundedness"];
const auxFields = ["skillable", "expressive", "noise"];

const dimLabels = {
  context: "情境辨识",
  boundary: "边界校准",
  generative: "生成重构",
  taste: "审美判别",
  stance: "价值定向",
  groundedness: "经验内化",
};

const dimDescriptions = {
  context: "看见任务说明之外的局",
  boundary: "知道方法什么时候会失效",
  generative: "不只选答案，还能改写问题",
  taste: "判断“对”之外的“好”",
  stance: "不把所有判断交给目标函数",
  groundedness: "让经历长成可用的直觉",
};

const dimHighCopy = {
  context: "你能看见任务说明之外的关系、时机和隐含约束。别人看到待办，你看到局面。",
  boundary: "你不迷信模板，也不为了显得独特而反模板。你知道方法何时可用，何时该停。",
  generative: "你不只在给定选项里挑答案，也会把空泛需求改成具体方向，把旧问题改成新问法。",
  taste: "你能识别正确但空心、专业但没取舍的东西。你的判断里有分寸，也有审美上的负责。",
  stance: "你能识别目标背后的价值冲突，并把取舍说成别人能理解、能协商的话。",
  groundedness: "你的判断不是观点堆叠，而是从真实经历里沉淀出来，并能迁移到新情境里。",
};

const dimLowCopy = {
  context: "你比较容易相信任务的字面意思。下一步可以练习问一句：这件事真正影响谁？",
  boundary: "你对流程比较友好，但容易被流程带着走。真正的经验，常常藏在“不适用”的地方。",
  generative: "你更擅长在现有选项中做选择。想提高含活人量，可以试着先改写问题，再寻找答案。",
  taste: "你容易把规范、完整、流畅当成好。下一步可以练习问：它有取舍吗？有人负责判断吗？",
  stance: "你很会完成目标，但有时会太快接受目标本身。人最难被复制的部分，常从“我不这样做”开始。",
  groundedness: "你的观点还缺少来处。多经历不是重点，重点是让经历变成下一次选择的理由。",
};

const chapters = [
  {
    name: "可 Skill 化",
    subtitle:
      "先从最危险的地方开始：你的工作方式能不能被写进说明书。能写清楚不是坏事，真正要测的是写完以后还剩多少判断带不走。",
  },
  {
    name: "情境辨识",
    subtitle:
      "这一部分测“读空气”，但不是测脑补。真正的情境辨识，是看见任务之外的关系、时机、风险，并变成下一步行动。",
  },
  {
    name: "边界校准",
    subtitle:
      "模板、流程、最佳实践都很有用，直到它们开始假装自己永远正确。这里测你知不知道方法什么时候该用、什么时候该停。",
  },
  {
    name: "审美判别",
    subtitle:
      "这里的审美不是高级感滤镜。它测的是当一个东西很流畅、很专业、很像样时，你还能不能判断它有没有取舍和灵魂。",
  },
  {
    name: "生成重构",
    subtitle:
      "真正难蒸的生成能力，是把空泛需求改成具体方向，把旧问题改成新问法，把经历变成别人没想到的方案。",
  },
  {
    name: "价值与经验",
    subtitle:
      "最后测那些最不容易写进提示词的东西：你在乎什么、经历过什么，以及你愿不愿意为判断负责。",
  },
];

const questions = [
  q(1, 0, "有人想把你做成“同事 Skill”，你第一反应是？", ["挺好，顺便帮我整理工作流", "可以，但它大概学不全我的判断", "先说清楚：资料从哪来，谁授权？", "我也说不清我怎么做事，但有些东西不能拿走"]),
  q(2, 0, "你写工作文档时，更像哪种？", ["写成别人照做就行", "写步骤，也写什么时候不能照做", "写到关键处，会标一句“这里要看情况”", "很少写，很多东西只有我在场才知道"]),
  q(3, 0, "同事问“这事有标准流程吗”，你会怎么回？", ["有，我发你", "有，但先看这次像不像", "有，不过先确认哪里不能照抄", "如果流程就够了，也不用来问我"]),
  q(4, 0, "如果 AI 替你上班一天，最可能出什么问题？", ["问题不大，交付还挺稳", "能做大半，但优先级会错", "事情做对了，方向却偏了", "它不知道什么时候该停"]),
  q(5, 1, "会上一个方案看着没毛病，但你觉得不对。你会：", ["先看数据", "问它在哪些条件下不成立", "把“不对劲”变成一个可验证的风险", "看看谁没说话，为什么没说"]),
  q(6, 1, "别人发来“你方便再看看吗”，你会理解成：", ["他就是让我看看", "可能有问题，但不好直说", "八成是想让我兜底", "先看关系、时间点和上下文"]),
  q(7, 1, "大家都说“先快速推进”，你会：", ["可以，先往前走", "先问快的代价是什么", "找出没人愿意说的风险", "判断这是不是在集体逃避"]),
  q(8, 1, "别人说“都可以，你决定吧”，你通常会：", ["直接选效率最高的", "先确认他是不是真的无所谓", "问清楚他最怕哪种结果", "看这句话背后是不是在回避责任"]),
  q(9, 2, "面对一个很模糊的任务，你第一步是：", ["拆任务，列步骤", "确认目标、限制和成功标准", "找真正拍板的人和隐含期待", "先判断这个任务是不是问错了"]),
  q(10, 2, "模板答案和你的直觉冲突时，你会：", ["先信模板", "检查直觉有没有依据", "做个小验证，看谁更接近现实", "先问这个模板是为谁设计的"]),
  q(11, 2, "一个流程执行得很顺，但结果不太好，你会先怀疑：", ["执行不到位", "指标选错了", "流程假设过期了", "一开始就把问题定义窄了"]),
  q(12, 2, "遇到一个“看起来很聪明”的方案，你最警惕：", ["它是不是太复杂", "它是不是难落地", "它解决的是不是真问题", "它是不是只是显得很聪明"]),
  q(13, 3, "看到一篇很流畅、很标准、很像 AI 写的文章，你会觉得：", ["挺好，省事", "能用，但没有判断痕迹", "它没有冒险，所以也没有选择", "我看不出作者本人在哪里"]),
  q(14, 3, "四个方案里，你更喜欢哪种？", ["稳妥、清楚、可复制", "有一点新意，风险可控", "不完美，但判断很明确", "一看就不是模板生成的"]),
  q(15, 3, "哪句话最有“活人味”？", ["建议按最佳实践推进", "建议先对齐目标和资源", "这个方案能赢，但赢得不好看", "我不反对，但想先说清楚哪里不舒服"]),
  q(16, 3, "你最受不了哪种“专业感”？", ["术语很多，但没说人话", "页面很满，但没有重点", "很正确，但没有取舍", "很像样，但没人负责判断"]),
  q(17, 4, "接到“做一版更高级的方案”，你第一步会：", ["找高级感参考，整理模板", "先问“高级”到底服务什么目标", "找出这个需求里最空的词", "先做一个有明确气质的样本"]),
  q(18, 4, "要把一句套话改得像人写的，你会先：", ["加一点情绪和修辞", "找到它真正想打动谁", "删掉套话，留下一个具体判断", "放进一点自己的经历感"]),
  q(19, 4, "你提出新想法时，更常从哪里开始？", ["现有框架缺哪块", "现有方案哪里让人不满意", "这个问题是不是问错了", "最近的真实经历里，有什么能和它连上"]),
  q(20, 4, "别人问“有没有更不一样的想法”，你会：", ["多给几个备选方向", "先问“不一样”要解决什么", "换一个问题问法", "拿一个有风险但有判断的方向出来"]),
  q(21, 5, "目标和价值感冲突时，你会：", ["先完成目标", "找一个折中方案", "说清冲突，并提出替代做法", "宁愿变慢，也不想变成那样"]),
  q(22, 5, "如果别人复刻了你的工作产出，你会觉得：", ["说明我方法沉淀得好", "有点不爽，但也合理", "他复刻不了我为什么那样做", "如果只剩产出能证明我，那我该升级了"]),
  q(23, 5, "你觉得“经验”最有价值的地方是：", ["做得更快", "少踩坑", "知道哪些坑值得踩", "能闻出事情开始变味的时刻"]),
  q(24, 5, "你希望自己在 AI 时代更像：", ["一个高质量可调用模块", "一个会用 AI 放大自己的专业人", "一个知道何时该用、何时不该用工具的人", "一个永远独特、拒绝被定义的人"]),
];

const scoreRows = `
1,A,0,0,0,0,0,0,2,1,0
1,B,0,2,0,0,0,1,1,1,0
1,C,0,1,0,0,3,0,0,1,0
1,D,0,0,0,0,1,2,0,0,1
2,A,0,0,0,0,0,0,2,1,0
2,B,0,3,0,0,0,1,1,2,0
2,C,1,1,0,0,0,1,1,1,0
2,D,0,0,0,0,0,1,0,0,2
3,A,0,0,0,0,0,0,2,1,0
3,B,1,2,0,0,0,0,1,1,0
3,C,1,3,0,0,0,0,0,2,0
3,D,0,2,0,0,0,1,0,0,1
4,A,0,0,0,0,0,0,2,1,0
4,B,2,0,0,0,0,1,1,0,0
4,C,1,2,0,0,2,0,0,1,0
4,D,1,0,0,0,2,1,0,0,0
5,A,0,0,0,0,0,0,1,1,0
5,B,1,2,0,0,0,0,0,2,0
5,C,2,2,0,0,0,1,0,2,0
5,D,3,0,0,0,0,1,0,0,0
6,A,0,0,0,0,0,0,1,0,0
6,B,1,0,0,0,0,0,0,0,0
6,C,1,0,0,0,0,0,0,0,2
6,D,3,0,0,0,0,1,0,1,0
7,A,0,0,0,0,0,0,1,0,0
7,B,1,1,0,0,1,0,0,2,0
7,C,2,2,0,0,1,1,0,1,0
7,D,2,0,0,0,2,0,0,0,1
8,A,0,0,0,0,0,0,2,0,0
8,B,2,0,0,0,0,0,1,1,0
8,C,3,0,0,0,0,1,0,1,0
8,D,2,0,0,0,0,0,0,0,1
9,A,0,0,0,0,0,0,2,1,0
9,B,1,1,0,0,0,0,1,2,0
9,C,3,0,0,0,0,1,0,1,0
9,D,1,2,0,0,1,0,0,0,1
10,A,0,0,0,0,0,0,2,0,0
10,B,0,1,0,0,0,1,0,2,0
10,C,0,3,0,0,0,2,0,2,0
10,D,0,2,0,0,1,0,0,0,0
11,A,0,0,0,0,0,0,2,0,0
11,B,0,1,0,0,0,0,1,1,0
11,C,0,3,0,0,1,1,0,1,0
11,D,0,2,0,0,2,1,0,0,0
12,A,0,0,0,1,0,0,0,0,1
12,B,0,1,0,1,0,0,0,1,0
12,C,0,2,0,2,0,0,0,1,0
12,D,0,1,0,3,0,0,0,0,1
13,A,0,0,0,0,0,0,2,0,0
13,B,0,1,0,2,0,0,0,1,0
13,C,0,1,0,2,1,0,0,1,0
13,D,0,0,0,2,0,1,0,0,1
14,A,0,0,0,0,0,0,2,1,0
14,B,0,0,1,0,0,0,1,1,0
14,C,0,0,2,2,1,0,0,1,0
14,D,0,0,1,1,0,0,0,0,1
15,A,0,0,0,0,0,0,2,1,0
15,B,0,0,0,0,0,0,1,2,0
15,C,1,0,0,2,2,0,0,1,0
15,D,1,0,0,1,1,0,0,1,0
16,A,0,0,0,1,0,0,0,0,0
16,B,0,0,0,1,0,0,0,0,0
16,C,0,0,0,3,2,0,0,1,0
16,D,0,0,0,2,2,0,0,0,0
17,A,0,0,0,0,0,0,2,1,0
17,B,2,0,1,1,0,0,1,2,0
17,C,0,2,1,1,0,0,0,1,0
17,D,0,0,3,2,0,1,0,0,0
18,A,0,0,1,0,0,0,1,0,1
18,B,2,0,1,1,0,0,0,1,0
18,C,0,1,3,2,1,0,0,1,0
18,D,0,0,1,1,0,2,0,0,1
19,A,0,0,0,0,0,0,1,1,0
19,B,1,1,1,0,0,0,0,1,0
19,C,0,2,1,0,1,0,0,0,0
19,D,0,0,3,1,0,2,0,0,0
20,A,0,0,1,0,0,0,1,1,0
20,B,1,1,1,0,0,0,0,2,0
20,C,0,2,2,0,0,0,0,1,0
20,D,0,1,3,1,1,0,0,0,0
21,A,0,0,0,0,0,0,1,0,0
21,B,1,0,0,0,1,0,0,1,0
21,C,1,0,0,0,3,0,0,2,0
21,D,0,0,0,0,2,0,0,0,1
22,A,0,0,0,0,0,0,2,2,0
22,B,0,0,0,0,0,1,0,0,0
22,C,0,0,0,0,1,2,0,0,1
22,D,0,2,0,0,2,1,0,0,0
23,A,0,0,0,0,0,0,2,0,0
23,B,0,0,0,0,0,1,1,0,0
23,C,0,1,0,0,0,3,0,1,0
23,D,2,0,0,0,0,3,0,0,0
24,A,0,0,0,0,0,0,2,1,0
24,B,0,0,0,0,0,1,1,2,0
24,C,1,2,0,0,3,0,0,1,0
24,D,0,0,1,0,0,0,0,0,2
`;

const scoreMap = parseScoreRows(scoreRows);
const anchorAnswers = new Set(["2:B", "5:C", "10:C", "21:C", "24:C"]);

const el = {
  intro: document.getElementById("intro"),
  tester: document.getElementById("tester"),
  results: document.getElementById("results"),
  startBtn: document.getElementById("startBtn"),
  retakeBtn: document.getElementById("retakeBtn"),
  prevBtn: document.getElementById("prevBtn"),
  progressText: document.getElementById("progressText"),
  chapterText: document.getElementById("chapterText"),
  progressFill: document.getElementById("progressFill"),
  chapterList: document.getElementById("chapterList"),
  questionChapter: document.getElementById("questionChapter"),
  questionSubtitle: document.getElementById("questionSubtitle"),
  questionTitle: document.getElementById("questionTitle"),
  options: document.getElementById("options"),
  resultTitle: document.getElementById("resultTitle"),
  resultType: document.getElementById("resultType"),
  resultCopy: document.getElementById("resultCopy"),
  heartLine: document.getElementById("heartLine"),
  humanScore: document.getElementById("humanScore"),
  undistillableScore: document.getElementById("undistillableScore"),
  skillFitScore: document.getElementById("skillFitScore"),
  shareLine: document.getElementById("shareLine"),
  dimensionBars: document.getElementById("dimensionBars"),
  personalNotes: document.getElementById("personalNotes"),
};

let current = 0;
let answers = {};

function q(id, chapter, title, optionTexts) {
  const ids = ["A", "B", "C", "D"];
  return {
    id,
    chapter,
    title,
    options: optionTexts.map((text, index) => ({
      id: ids[index],
      text,
    })),
  };
}

function parseScoreRows(rows) {
  const fields = [...dims, ...auxFields];
  return rows.trim().split("\n").reduce((map, row) => {
    const [question, option, ...values] = row.split(",");
    map[`${question}:${option}`] = fields.reduce((score, field, index) => {
      score[field] = Number(values[index]);
      return score;
    }, {});
    return map;
  }, {});
}

function start() {
  current = 0;
  answers = {};
  el.intro.classList.add("hidden");
  el.results.classList.add("hidden");
  el.tester.classList.remove("hidden");
  renderQuestion();
}

function restart() {
  current = 0;
  answers = {};
  el.results.classList.add("hidden");
  el.intro.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderQuestion() {
  const question = questions[current];
  const chapter = chapters[question.chapter];
  const answeredCount = Object.keys(answers).length;
  const displayIndex = current + 1;
  const progress = ((answeredCount) / questions.length) * 100;

  el.progressText.textContent = `第 ${displayIndex} / ${questions.length} 题`;
  el.chapterText.textContent = chapter.name;
  el.progressFill.style.width = `${progress}%`;
  el.questionChapter.textContent = `第 ${question.chapter + 1} 章 · ${chapter.name}`;
  el.questionSubtitle.textContent = chapter.subtitle;
  el.questionTitle.textContent = question.title;
  el.prevBtn.disabled = current === 0;

  el.options.innerHTML = "";
  question.options.forEach((option) => {
    const button = document.createElement("button");
    button.className = `option ${answers[question.id] === option.id ? "selected" : ""}`;
    button.type = "button";
    button.innerHTML = `<span class="option-letter">${option.id}</span><span class="option-text">${option.text}</span>`;
    button.addEventListener("click", () => {
      answers[question.id] = option.id;
      if (current < questions.length - 1) {
        current += 1;
        renderQuestion();
      } else {
        showResults();
      }
    });
    el.options.appendChild(button);
  });

  renderChapterList();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderChapterList() {
  el.chapterList.innerHTML = "";
  chapters.forEach((chapter, index) => {
    const chapterQuestions = questions.filter((question) => question.chapter === index);
    const doneCount = chapterQuestions.filter((question) => answers[question.id]).length;
    const item = document.createElement("div");
    item.className = `chapter-item ${index === questions[current].chapter ? "active" : ""} ${doneCount === chapterQuestions.length ? "done" : ""}`;
    item.innerHTML = `<span>${doneCount === chapterQuestions.length ? "✓" : index + 1}</span><strong>${chapter.name}</strong>`;
    el.chapterList.appendChild(item);
  });
}

function scoreAnswers() {
  const totals = [...dims, ...auxFields].reduce((state, field) => {
    state[field] = 0;
    return state;
  }, {});
  let anchorHits = 0;

  questions.forEach((question) => {
    const optionId = answers[question.id];
    const score = scoreMap[`${question.id}:${optionId}`] || {};
    [...dims, ...auxFields].forEach((field) => {
      totals[field] += score[field] || 0;
    });
    if (anchorAnswers.has(`${question.id}:${optionId}`)) anchorHits += 1;
  });

  const bankMax = calculateBankMax();
  const positiveRaw = dims.reduce((sum, field) => sum + totals[field], 0);
  const positiveScore = safeRatio(positiveRaw, bankMax.positive);
  const expressiveScore = safeRatio(totals.expressive, bankMax.expressive);
  const skillableScore = safeRatio(totals.skillable, bankMax.skillable);
  const noiseScore = safeRatio(totals.noise, bankMax.noise);
  const dimensionScores = dims.map((field) => safeRatio(totals[field], bankMax.dims[field]));
  const balanceScore = balance(dimensionScores);
  const expressionBonus = Math.min(expressiveScore, positiveScore) * 0.15;
  const skillPenalty = skillableScore <= 0.45 ? 0 : (skillableScore - 0.45) * (1 - positiveScore) * 0.35;
  const noisePenalty = noiseScore * 0.18;
  const anchorBonus = anchorHits <= 1 ? 0 : anchorHits <= 3 ? 0.025 : 0.05;
  const human = positiveScore * 0.7 + expressionBonus + balanceScore * 0.1 + anchorBonus - skillPenalty - noisePenalty;
  const undistillable = positiveScore * 0.75 + balanceScore * 0.1 + expressionBonus + anchorBonus * 0.7 - noiseScore * 0.1 - skillPenalty * 0.5;
  const skillFit = skillableScore * 0.55 + expressiveScore * 0.3 + (1 - noiseScore) * 0.15;

  return {
    totals,
    bankMax,
    anchorHits,
    positiveScore,
    expressiveScore,
    skillableScore,
    noiseScore,
    balanceScore,
    humanScore: displayHumanScore(human, noiseScore),
    undistillableScore: clamp(Math.round(undistillable * 100), 0, 100),
    skillFitScore: clamp(Math.round(skillFit * 100), 0, 100),
  };
}

function calculateBankMax() {
  const maxes = {
    dims: dims.reduce((state, field) => {
      state[field] = 0;
      return state;
    }, {}),
    positive: 0,
    expressive: 0,
    skillable: 0,
    noise: 0,
  };

  questions.forEach((question) => {
    dims.forEach((field) => {
      maxes.dims[field] += Math.max(...question.options.map((option) => scoreMap[`${question.id}:${option.id}`][field]));
    });
    maxes.expressive += Math.max(...question.options.map((option) => scoreMap[`${question.id}:${option.id}`].expressive));
    maxes.skillable += Math.max(...question.options.map((option) => scoreMap[`${question.id}:${option.id}`].skillable));
    maxes.noise += Math.max(...question.options.map((option) => scoreMap[`${question.id}:${option.id}`].noise));
  });
  maxes.positive = dims.reduce((sum, field) => sum + maxes.dims[field], 0);
  return maxes;
}

function displayHumanScore(measuredHumanScore, noiseScore) {
  let score = measuredHumanScore <= 0.05 ? 18 : clamp(Math.round(20 + measuredHumanScore * 85), 20, 100);
  if (noiseScore >= 0.7) score = Math.min(score, 52);
  if (noiseScore >= 0.5) score = Math.min(score, 65);
  return score;
}

function balance(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (!mean) return 0;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return clamp(1 - Math.sqrt(variance) / mean, 0, 1);
}

function showResults() {
  const result = scoreAnswers();
  const band = resultBand(result.humanScore);
  const strongest = strongestDimension(result);
  const weakest = weakestDimension(result);

  el.tester.classList.add("hidden");
  el.results.classList.remove("hidden");
  el.resultTitle.textContent = band.title;
  el.resultType.textContent = band.type;
  el.resultCopy.textContent = band.copy;
  el.heartLine.textContent = comboResult(result, strongest);
  el.humanScore.textContent = `${result.humanScore}%`;
  el.undistillableScore.textContent = `${result.undistillableScore}%`;
  el.skillFitScore.textContent = `${result.skillFitScore}%`;
  el.shareLine.textContent = band.share;
  renderBars(result);
  renderPersonalNotes(strongest, weakest, result);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderBars(result) {
  el.dimensionBars.innerHTML = "";
  dims.forEach((field) => {
    const value = Math.round(safeRatio(result.totals[field], result.bankMax.dims[field]) * 100);
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <span><b>${dimLabels[field]}</b><small>${dimDescriptions[field]}</small></span>
      <div class="bar-track"><div class="bar-fill" style="width: ${value}%"></div></div>
      <strong>${value}</strong>
    `;
    el.dimensionBars.appendChild(row);
  });
}

function renderPersonalNotes(strongest, weakest, result) {
  const noiseCopy =
    result.noiseScore >= 0.5
      ? "你的结果里有一些“伪抗蒸噪声”：难懂、拒绝表达或只凭不舒服，并不会自动变成不可复制。"
      : "你的结果没有明显奖励“故作神秘”。这很好，成熟的抗蒸性通常是说得清一部分，但复制仍然会损耗。";
  const skillCopy =
    result.skillFitScore >= 62
      ? "你的方法有不少能被整理、复用和调用的部分。这不是坏事，它说明你清晰、稳定，也更容易协作。"
      : "你不算特别容易被整理成稳定 Skill。真正的提升不是变得更神秘，而是把能说清的部分说清，把说不清的部分变成可验证判断。";
  el.personalNotes.innerHTML = `
    <p>${dimHighCopy[strongest]}</p>
    <p>${dimLowCopy[weakest]}</p>
    <p>${skillCopy}</p>
    <p>${noiseCopy}</p>
  `;
}

function strongestDimension(result) {
  return dims.reduce((best, field) => {
    const value = safeRatio(result.totals[field], result.bankMax.dims[field]);
    const bestValue = safeRatio(result.totals[best], result.bankMax.dims[best]);
    return value > bestValue ? field : best;
  }, dims[0]);
}

function weakestDimension(result) {
  return dims.reduce((worst, field) => {
    const value = safeRatio(result.totals[field], result.bankMax.dims[field]);
    const worstValue = safeRatio(result.totals[worst], result.bankMax.dims[worst]);
    return value < worstValue ? field : worst;
  }, dims[0]);
}

function resultBand(score) {
  if (score >= 86) {
    return {
      title: "高密度活人型",
      type: "能表达，也难低损耗复制",
      copy: "你的判断里有情境、边界、取舍和真实来处。别人可以学到你的方法，但很难无损复制你为什么在那个时刻那样做。",
      share: "我不是不能写成 Skill，是写完还会剩下我。",
    };
  }
  if (score >= 72) {
    return {
      title: "成熟抗蒸型",
      type: "有流程，也有例外判断",
      copy: "你的很多做法可以被整理出来，但关键处仍然需要你本人校准。你不是靠神秘感抗蒸，而是靠复杂判断抗蒸。",
      share: "我大部分可协作，关键处不可代班。",
    };
  }
  if (score >= 55) {
    return {
      title: "半蒸半活型",
      type: "一半可调用，一半还活着",
      copy: "你有稳定、好复用的一面，也保留了一些情境判断和个人取舍。继续练习把隐性判断说清，会让你的抗蒸性更健康。",
      share: "一半可调用，一半还活着。",
    };
  }
  if (score >= 38) {
    return {
      title: "高协作可蒸型",
      type: "清晰稳定，但判断痕迹偏少",
      copy: "你的工作方式很适合被整理成流程，这在协作中是优点。只是如果所有选择都能被说明书解释，含活人量会显得偏低。",
      share: "我很好复用，但正在补判断痕迹。",
    };
  }
  return {
    title: "低损耗可替身型",
    type: "像一个稳定模块，但还不像完整的人",
    copy: "你的选择更偏流程执行和目标完成。下一步不是变得更难懂，而是练习识别例外、说明取舍、把经历变成判断。",
    share: "我先承认：我现在有点太好蒸了。",
  };
}

function comboResult(result, strongest) {
  if (result.anchorHits >= 4) return "你命中了多道判断力锚点：复杂，但不是玄学；有立场，也能说清。";
  if (result.noiseScore >= 0.5) return "你的“不可复制”里混入了一些说不清的噪声，系统已经做了保护校准。";
  if (result.skillFitScore >= 70 && result.humanScore >= 70) return "你很适合写成 Skill，但写完以后仍然剩下不少本人判断。";
  return `你最明显的活人痕迹在「${dimLabels[strongest]}」：${dimDescriptions[strongest]}。`;
}

function safeRatio(value, denominator) {
  return denominator ? value / denominator : 0;
}

function clamp(value, low, high) {
  return Math.min(Math.max(value, low), high);
}

el.startBtn.addEventListener("click", start);
el.retakeBtn.addEventListener("click", restart);
el.prevBtn.addEventListener("click", () => {
  current = Math.max(current - 1, 0);
  renderQuestion();
});
