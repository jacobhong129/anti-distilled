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
    name: "说明书化",
    subtitle:
      "先测你有多容易被整理成一个 Skill。写得清楚不是坏事，真正的问题是：别人照着做时，会在哪一步开始变味？",
  },
  {
    name: "读懂局",
    subtitle:
      "有些任务，字面意思只占一半。这一章测你能不能看见关系、时机和没说出口的风险。",
  },
  {
    name: "校准方法",
    subtitle:
      "模板不是敌人，误用模板才是。这一章测你知不知道一套方法什么时候该用，什么时候该停。",
  },
  {
    name: "判断口味",
    subtitle:
      "很多东西看起来专业，其实只是像样。这一章测你能不能看出取舍、分寸和空心感。",
  },
  {
    name: "长出新东西",
    subtitle:
      "不是多想几个点子就叫创造。这一章测你能不能把空泛需求，改成一个有判断的方向。",
  },
  {
    name: "自己的来处",
    subtitle:
      "最难蒸的，往往不是知识，而是你为什么这样选。这一章测你的经历、价值和工具边界。",
  },
];

const questions = [
  q(1, 0, "有人要把你做成“同事 Skill”，你第一反应是？", ["可以，正好整理我的流程", "可以，但要写清哪些场景不能照用", "先确认资料来源和授权边界", "别做，我自己都说不清"]),
  q(2, 0, "你写文档时，通常写到哪一步？", ["写清操作步骤，让别人照做", "加上注意事项，避免常见坑", "写出判断依据，说明为什么这么做", "写不下去，很多东西靠现场判断"]),
  q(3, 0, "别人照你的文档做错了，你会先想：", ["可能是文档没写清楚", "可能是他没懂前提", "可能是这里本来就需要判断", "可能这事不适合只靠文档"]),
  q(4, 0, "同事问“这事有模板吗”，你会：", ["有，直接把模板发给他", "先问这次是不是同类问题", "先提醒模板最容易用错的地方", "反问他为什么一定要用模板"]),
  q(5, 1, "会上方案看着没问题，但你觉得怪。你会：", ["先看数据支不支持", "问它在哪些情况下不成立", "把“怪”的感觉说成一个具体风险", "先看谁一直没说话"]),
  q(6, 1, "别人说“你方便再看看吗”，你会：", ["可以，直接帮他看一遍", "先问他最担心哪里", "看上下文，再决定怎么回", "默认这是想让我兜底"]),
  q(7, 1, "大家都说“先推进”，你会：", ["先动起来，别卡住节奏", "先问快起来要牺牲什么", "指出一个以后可能爆掉的风险", "觉得大家在逃避，但不一定说"]),
  q(8, 1, "老板说“你看着办”，你会：", ["自己定一个方案推进", "先确认不能踩的底线", "问清他最不想看到什么结果", "猜他其实已经有答案"]),
  q(9, 2, "模板答案和你的直觉冲突，你会：", ["先按模板来，别想太多", "检查自己的直觉有没有证据", "做个小验证，看谁更接近现实", "先怀疑这个模板不适合当前情况"]),
  q(10, 2, "一个流程很顺，但结果不好，你先怀疑：", ["可能是执行不到位", "可能是指标选错了", "可能是流程背后的假设过期了", "可能一开始就问错了问题"]),
  q(11, 2, "AI 给了一个很完整的方案，你会：", ["直接照着改，先提高效率", "检查它有没有漏掉真实目标", "找出其中最可能出错的一步", "先警惕它是不是顺得过头"]),
  q(12, 2, "你最怕团队陷入：", ["没有流程，大家各做各的", "流程太慢，事情推不动", "用流程替代判断", "人人都反流程，谁也不服谁"]),
  q(13, 3, "看到一篇很像 AI 的文章，你会：", ["觉得能用，先解决问题", "觉得它没什么个人判断", "想知道作者到底想押哪个观点", "想把它改得更像真人写的"]),
  q(14, 3, "四个方案你更常选：", ["稳妥清楚，方便执行", "有点新意，但风险可控", "有缺点，但判断很明确", "很不一样，虽然现在还说不清"]),
  q(15, 3, "你最烦哪种专业感？", ["术语很多，但没说人话", "内容很满，但没有重点", "看起来正确，但没有取舍", "很像样，但没人负责判断"]),
  q(16, 3, "你判断一句文案好不好，先看：", ["读起来顺不顺", "意思清不清楚", "有没有一个具体判断", "像不像真人会说的话"]),
  q(17, 4, "接到“做高级点”，你先：", ["找参考，先搭一个像样版本", "问清它要打动谁", "找出“高级”这个词到底空在哪", "先做一个样本，让大家看感觉"]),
  q(18, 4, "改一句套话，你先：", ["加一点情绪和修辞", "先找到它想打动的人", "删掉套话，留下一个具体判断", "放进一点自己的真实经历"]),
  q(19, 4, "别人要“不一样的想法”，你会：", ["多给几个备选方向", "先问“不一样”是为了解决什么", "换一个问题问法", "拿一个有风险但有判断的方向"]),
  q(20, 4, "一个方案太普通，你会先加：", ["更完整的结构", "更清楚的目标", "一个真实存在的矛盾", "一个只有我会这样处理的角度"]),
  q(21, 5, "目标和价值冲突时，你会：", ["先完成目标", "找一个折中方案", "说清冲突，并提出替代做法", "宁愿变慢，也不想那样做"]),
  q(22, 5, "别人复刻你的产出，你会：", ["说明我的方法沉淀得不错", "有点不爽，但也能接受", "他复刻不了我为什么那样做", "如果只剩产出能证明我，那我该升级了"]),
  q(23, 5, "当 AI 建议很合理，但你不想照做，你会：", ["还是照做，先相信工具", "找找自己为什么不想照做", "看它是不是忽略了某个代价", "直接相信自己的判断"]),
  q(24, 5, "你希望自己在 AI 时代更像：", ["一个高质量可调用模块", "一个会用 AI 放大自己的专业人", "一个知道何时不该用工具的人", "一个永远独特、拒绝被定义的人"]),
];

const scoreRows = `
1,A,0,0,0,0,0,0,2,1,0
1,B,0,2,0,0,0,1,1,2,0
1,C,0,1,0,0,3,0,0,1,0
1,D,0,0,0,0,1,1,0,0,2
2,A,0,0,0,0,0,0,2,1,0
2,B,0,1,0,0,0,1,1,1,0
2,C,0,3,0,0,0,1,0,2,0
2,D,0,0,0,0,0,1,0,0,2
3,A,0,0,0,0,0,0,2,1,0
3,B,1,1,0,0,0,1,1,1,0
3,C,0,2,0,0,0,1,0,1,0
3,D,0,2,0,0,0,0,0,0,1
4,A,0,0,0,0,0,0,2,1,0
4,B,1,2,0,0,0,0,1,1,0
4,C,0,3,0,0,0,0,0,2,0
4,D,0,1,0,0,1,0,0,0,1
5,A,0,0,0,0,0,0,1,1,0
5,B,1,2,0,0,0,0,0,2,0
5,C,2,1,0,0,0,1,0,2,0
5,D,3,0,0,0,0,1,0,0,0
6,A,0,0,0,0,0,0,1,0,0
6,B,1,0,0,0,0,0,0,1,0
6,C,3,1,0,0,0,0,0,1,0
6,D,1,0,0,0,0,0,0,0,2
7,A,0,0,0,0,0,0,1,0,0
7,B,1,1,0,0,1,0,0,2,0
7,C,2,1,0,0,1,1,0,1,0
7,D,2,0,0,0,1,0,0,0,1
8,A,0,0,0,0,0,0,2,0,0
8,B,2,1,0,0,0,0,1,1,0
8,C,3,0,0,0,1,0,0,1,0
8,D,1,0,0,0,0,0,0,0,2
9,A,0,0,0,0,0,0,2,1,0
9,B,0,1,0,0,0,1,0,2,0
9,C,0,3,0,0,0,2,0,2,0
9,D,0,2,0,0,0,0,0,0,1
10,A,0,0,0,0,0,0,2,0,0
10,B,0,1,0,0,0,1,0,2,0
10,C,0,3,0,0,1,1,0,1,0
10,D,0,2,1,0,2,0,0,1,0
11,A,0,0,0,0,0,0,2,0,0
11,B,1,2,0,0,0,0,0,1,0
11,C,0,2,0,0,0,1,0,1,0
11,D,0,1,0,1,0,0,0,0,1
12,A,0,0,0,0,0,0,1,0,0
12,B,0,0,0,0,0,0,1,0,0
12,C,0,3,0,0,1,0,0,1,0
12,D,0,1,0,0,0,0,0,0,2
13,A,0,0,0,0,0,0,2,0,0
13,B,0,1,0,2,0,0,0,1,0
13,C,0,1,0,2,1,0,0,1,0
13,D,0,0,1,1,0,0,0,0,1
14,A,0,0,0,0,0,0,2,1,0
14,B,0,0,1,1,0,0,1,1,0
14,C,0,0,2,2,1,0,0,1,0
14,D,0,0,1,0,0,0,0,0,2
15,A,0,0,0,1,0,0,0,1,0
15,B,0,0,0,1,0,0,0,1,0
15,C,0,0,0,3,1,0,0,1,0
15,D,0,0,0,2,2,0,0,1,0
16,A,0,0,0,1,0,0,0,0,0
16,B,0,0,0,1,0,0,0,1,0
16,C,0,0,1,2,0,0,0,1,0
16,D,0,0,0,1,0,1,0,0,1
17,A,0,0,0,1,0,0,2,1,0
17,B,1,0,1,1,0,0,0,2,0
17,C,0,1,2,1,0,0,0,1,0
17,D,0,0,3,2,0,1,0,0,0
18,A,0,0,1,0,0,0,1,0,1
18,B,2,0,1,1,0,0,0,1,0
18,C,0,1,3,2,1,0,0,1,0
18,D,0,0,1,1,0,2,0,0,1
19,A,0,0,1,0,0,0,1,1,0
19,B,0,1,1,0,0,0,0,2,0
19,C,0,2,2,0,0,0,0,1,0
19,D,0,0,3,1,1,0,0,1,0
20,A,0,0,1,0,0,0,1,1,0
20,B,1,1,1,0,0,0,0,2,0
20,C,0,0,2,1,0,1,0,1,0
20,D,0,0,3,1,0,1,0,0,0
21,A,0,0,0,0,0,0,1,0,0
21,B,1,0,0,0,1,0,0,1,0
21,C,1,0,0,0,3,0,0,2,0
21,D,0,0,0,0,2,0,0,0,1
22,A,0,0,0,0,0,0,2,2,0
22,B,0,0,0,0,0,1,0,0,0
22,C,0,0,0,0,1,2,0,0,1
22,D,0,1,0,0,2,1,0,1,0
23,A,0,0,0,0,0,0,2,0,0
23,B,0,0,0,0,0,2,0,1,0
23,C,0,2,0,0,1,1,0,1,0
23,D,0,0,0,0,1,0,0,0,2
24,A,0,0,0,0,0,0,2,1,0
24,B,0,0,0,0,0,1,1,2,0
24,C,1,2,0,0,3,0,0,1,0
24,D,0,0,1,0,0,0,0,0,2
`;

const scoreMap = parseScoreRows(scoreRows);
const anchorAnswers = new Set(["2:C", "5:C", "9:C", "21:C", "24:C"]);

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
