import { AdaptiveAssessment, METRIC_NAMES } from "./adaptive-engine.js";

const app = document.querySelector("#app");
const restartTopButton = document.querySelector("#restartTopButton");
const learnTopButton = document.querySelector("#learnTopButton");
const templates = {
  start: document.querySelector("#startTemplate"),
  learn: document.querySelector("#learnTemplate"),
  calibration: document.querySelector("#calibrationTemplate"),
  question: document.querySelector("#questionTemplate"),
  result: document.querySelector("#resultTemplate"),
  detail: document.querySelector("#detailTemplate"),
};

const DIMENSION_DETAILS = {
  CXT: {
    subtitle: "读懂任务说明之外的局。",
    meaning: "情境辨识看的是你能不能发现话外信息、关系结构、时机和隐含约束。",
    evidence: "分数较高时，你通常不会只按字面任务行动，而会先判断这件事真正影响谁、风险在哪里。",
    growth: "练习在接到任务后多问一句：这里没说出口的约束是什么？",
  },
  BND: {
    subtitle: "知道方法什么时候会失效。",
    meaning: "边界校准看的是你对模板、流程、AI 输出和经验方法的适用范围判断。",
    evidence: "分数较高时，你不是反流程，而是知道什么时候该照做，什么时候必须停下来重判。",
    growth: "每次复盘时记录一个“这套方法不适用”的场景。",
  },
  GEN: {
    subtitle: "把问题改准，而不只是答题。",
    meaning: "生成重构看的是你能不能把模糊、空泛或方向错的问题改写成真正值得解决的问题。",
    evidence: "分数较高时，你会先修正问题定义，再进入方案产出。",
    growth: "在做方案前先写下：如果题目本身问错了，错在哪里？",
  },
  TST: {
    subtitle: "分辨完整外壳下有没有真实判断。",
    meaning: "审美判别看的是你能不能识别顺滑、专业、结构完整但缺少取舍的内容。",
    evidence: "分数较高时，你能看出漂亮话、空心专业感和没有对象感的表达。",
    growth: "评价一个方案时，不只问对不对，也问它有没有明确取舍。",
  },
  STN: {
    subtitle: "面对目标仍然保留价值取向。",
    meaning: "价值定向看的是目标、效率和风险冲突时，你是否能说清楚不能牺牲什么。",
    evidence: "分数较高时，你不只完成目标，也会判断目标本身是否值得照单全收。",
    growth: "为重要工作写一条“我不愿牺牲的东西”。",
  },
  GRD: {
    subtitle: "让经历沉淀成可解释的判断。",
    meaning: "经验内化看的是你的判断是否能追溯到真实案例、失败、长期观察或校准过程。",
    evidence: "分数较高时，你的直觉不是玄学，而是经验被压缩后的判断。",
    growth: "把一个直觉判断补成：我为什么这么想？来自哪次经验？",
  },
};

let assessment;
let latestResult;
let answerHistory = [];
let detailContext = { dimensions: [], activeIndex: 0 };
let activeDetailEscapeHandler;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadConfig() {
  const response = await fetch("./data/game-config.json", { cache: "no-store" });
  if (!response.ok) throw new Error("无法加载测评配置");
  return response.json();
}

function mount(templateName, viewName = templateName) {
  document.body.dataset.view = viewName;
  app.replaceChildren(templates[templateName].content.cloneNode(true));
  window.scrollTo({ top: 0, behavior: "instant" });
}

function setTopbar(mode) {
  restartTopButton.hidden = mode === "start" || mode === "learn";
  learnTopButton.hidden = mode === "learn" || mode === "result";
}

function renderStart() {
  mount("start");
  setTopbar("start");
  document.querySelector("#startButton").addEventListener("click", renderCalibration);
  document.querySelector("#learnButton").addEventListener("click", renderLearn);
}

function renderLearn() {
  mount("learn");
  setTopbar("learn");
  document.querySelector("#learnStartButton").addEventListener("click", renderCalibration);
  document.querySelector("#learnBackButton").addEventListener("click", renderStart);
}

function renderCalibration() {
  mount("calibration");
  setTopbar("calibration");
  document.querySelector("#calibrationContinueButton").addEventListener("click", () => startAssessment(collectRoleContext()));
  document.querySelector("#calibrationSkipButton").addEventListener("click", () => startAssessment({ skipped: true }));
}

function collectRoleContext() {
  const form = document.querySelector("#roleForm");
  if (!form) return {};
  const data = new FormData(form);
  return {
    taskShape: data.get("taskShape") || "",
    aiExposure: data.get("aiExposure") || "",
    sopHardPart: data.get("sopHardPart") || "",
  };
}

function startAssessment(roleContext) {
  answerHistory = [];
  assessment.start(roleContext);
  renderQuestion();
}

function renderQuestion() {
  const item = assessment.currentItem;
  if (!item) {
    renderResult(assessment.result());
    return;
  }

  mount("question", "question");
  setTopbar("question");
  const progress = assessment.progress;
  document.querySelector("#phaseLabel").textContent = progress.label;
  document.querySelector("#questionText").textContent = item.question;
  document.querySelector("#progressText").textContent = `${progress.answered} 题已回答`;
  document.querySelector("#progressBar").style.width = `${progress.percent}%`;
  document.querySelector("#sectionIntro").textContent = progress.intro;

  const backButton = document.querySelector("#backButton");
  backButton.disabled = answerHistory.length === 0;
  backButton.addEventListener("click", goBackOneQuestion);

  const optionList = document.querySelector("#optionList");
  for (const option of assessment.orderedOptions(item)) {
    const button = document.createElement("button");
    button.className = "option-button";
    button.type = "button";
    button.textContent = option.text;
    button.addEventListener("click", () => handleAnswer(button, option.key));
    optionList.append(button);
  }
}

function goBackOneQuestion() {
  const snapshot = answerHistory.pop();
  assessment.restoreSnapshot(snapshot);
  renderQuestion();
}

async function handleAnswer(button, optionKey) {
  answerHistory.push(assessment.getSnapshot());
  const options = [...document.querySelectorAll(".option-button")];
  options.forEach((option) => {
    option.disabled = true;
    option.classList.toggle("is-selected", option === button);
  });
  await sleep(160);
  const result = assessment.answerCurrent(optionKey);
  if (result) renderResult(result);
  else renderQuestion();
}

function renderResult(result) {
  latestResult = result;
  mount("result", resultSmokeTier(result.score));
  setTopbar("result");

  document.querySelector("#scoreValue").textContent = result.score;
  document.querySelector("#bandPill").textContent = bandPillText(result.score);
  document.querySelector("#bandBadge").dataset.tier = resultSmokeTier(result.score);
  document.querySelector("#labelOrb").dataset.label = labelVisualKey(result.labelDetails.name);
  document.querySelector("#scoreHelp").textContent = scoreHelpText(result.score);
  document.querySelector("#bandName").textContent = result.band.name;
  document.querySelector("#bandLine").textContent = result.band.line;
  document.querySelector("#bandRoast").textContent = bandRoastText(result);
  document.querySelector("#labelName").textContent = result.labelDetails.name;
  document.querySelector("#labelMeaning").textContent = result.labelDetails.plainMeaning;
  document.querySelector("#reasoningText").textContent = buildReasoningText(result);
  document.querySelector("#shareLine").textContent = buildShareLine(result);
  document.querySelector("#roleResult").textContent = result.role;
  document.querySelector("#labelDetailButton").addEventListener("click", () => openLabelDetail(result));

  renderDimensions(result);
  renderSignals(result);

  document.querySelector("#restartButton").addEventListener("click", renderStart);
  document.querySelector("#copyButton").addEventListener("click", copyResult);
  document.querySelector("#methodButton").addEventListener("click", openMethodDetail);
}

function resultSmokeTier(score) {
  if (score >= 80) return "result-rich";
  if (score >= 62) return "result-color";
  if (score >= 45) return "result-soft";
  return "result-gray";
}

function renderDimensions(result) {
  const dimensionList = document.querySelector("#dimensionList");
  detailContext.dimensions = result.dimensions;
  for (const [index, dimension] of result.dimensions.entries()) {
    const button = document.createElement("button");
    button.className = `dimension-row dimension-${dimension.key}`;
    button.type = "button";
    button.innerHTML = `
      <div class="dimension-head">
        <span class="dimension-icon" aria-hidden="true">${dimensionIcon(dimension.key)}</span>
        <span>${dimension.name}</span>
        <strong>${dimension.value}%</strong>
      </div>
      <div class="dimension-track"><span style="width:${dimension.value}%"></span></div>
      <p>${dimensionCopy(dimension.key, dimension.value)}</p>
    `;
    button.addEventListener("click", () => openDimensionDetail(index));
    dimensionList.append(button);
  }
}

function dimensionIcon(metric) {
  const icons = {
    CXT: "◎",
    BND: "⌖",
    GEN: "◇",
    TST: "◌",
    STN: "♡",
    GRD: "♧",
  };
  return icons[metric] || "◇";
}

function labelVisualKey(name = "") {
  if (name.includes("边界")) return "boundary";
  if (name.includes("经验") || name.includes("直觉")) return "experience";
  if (name.includes("审美") || name.includes("空心")) return "taste";
  if (name.includes("生成") || name.includes("重构")) return "generate";
  if (name.includes("执行") || name.includes("流程")) return "method";
  return "human";
}

function renderSignals(result) {
  const signalList = document.querySelector("#signalList");
  const chips = [`本次完成 ${result.answeredCount} 题后停止`];
  if (result.stabilityLevel === "light_swing") chips.push("结果有轻微摇摆");
  chips.push(...(result.openRisks || []).map(riskCopy));
  chips.push(...result.signals.map((signal) => `${signal.name} ${signal.value}`));

  for (const text of chips) {
    const chip = document.createElement("div");
    chip.className = text.includes("校验") || text.includes("摇摆") ? "signal-chip signal-chip-warn" : "signal-chip";
    chip.textContent = text;
    signalList.append(chip);
  }
}

function buildReasoningText(result) {
  const top = result.signals.slice(0, 2).map((signal) => signal.name).join("、");
  const low = result.dimensions
    .filter((dimension) => dimension.value < 48)
    .map((dimension) => dimension.name)
    .slice(0, 2)
    .join("、");
  if (low) {
    return `你的含活人量主要来自${top}上的有效信号，同时${low}还有成长空间。这个百分比不是人格定论，而是对当前判断结构的快照。`;
  }
  return `你的含活人量主要来自${top}上的稳定信号。后续追问的作用，是确认这些信号不是偶然选择，而是在多个场景中反复出现。`;
}

function buildCandidateText(result) {
  const candidates = result.labelCandidates || [];
  if (!candidates.length) return "系统已经给出主标签；候选标签不足以形成额外解释。";
  return `主标签之外，系统还参考了 ${candidates.join("、")} 等候选结构，用来避免单一标签把复杂回答吞掉。`;
}

function bandPillText(score) {
  if (score >= 80) return "人味难蒸";
  if (score >= 62) return "蒸馏高损";
  if (score >= 45) return "半蒸半活";
  return "流程友好";
}

function scoreHelpText(score) {
  if (score >= 80) return "你不是不能被总结，是一总结就容易把关键人味总结丢。";
  if (score >= 62) return "你的流程能被学走，但例外、边界和取舍还得本人校准。";
  if (score >= 45) return "你有一部分很适合沉淀成 Skill，也还有一些判断正在长出来。";
  return "你很适合标准化复制，下一步是把经验从步骤里拎出来。";
}

function bandRoastText(result) {
  const label = result.labelDetails?.name || "判断结构";
  if (result.score >= 80) return `蒸馏瓶已经开始冒烟：${label}这块，复制品容易只学到姿势，学不到手感。`;
  if (result.score >= 62) return `你不是反流程的人，但流程遇到你会有点紧张：关键时候还得问一句“本人怎么看”。`;
  if (result.score >= 45) return `目前是“能蒸，但别蒸太干”的状态：标准动作可交给工具，判断部分建议留给自己。`;
  return `你很适合做成高质量 SOP，但别急着把自己全交出去：先把几个真实判断点养肥。`;
}

function buildShareLine(result) {
  return `我的含活人量 ${result.score}%｜${result.band.name}｜${result.labelDetails.name}：${result.labelDetails.shareLine || result.band.line}`;
}

function riskCopy(risk) {
  const copy = {
    polished_answer_risk: "体面答案校验",
    ai_underrecognized_risk: "AI 放大校验",
    low_band_flattening_risk: "低分分型校验",
  };
  return copy[risk] || "风险校验";
}

function dimensionCopy(metric, value) {
  const high = {
    CXT: "能读懂话外信息和场景约束。",
    BND: "知道工具、流程和模板什么时候不能硬套。",
    GEN: "能把模糊问题改写成更值得解决的问题。",
    TST: "能分辨完整外壳下有没有真实判断。",
    STN: "面对取舍时能保留清楚的价值方向。",
    GRD: "经验不只是经历，而能沉淀成判断。",
  };
  const mid = {
    CXT: "有一定场景感，但偶尔会被表面任务带走。",
    BND: "能意识到边界，但还可以更快说清依据。",
    GEN: "能提出方案，也可以继续练习改题能力。",
    TST: "能察觉不对劲，但判断语言还可更稳定。",
    STN: "有底线感，下一步是把底线转成动作。",
    GRD: "经验正在积累，还需要更多复盘变成方法。",
  };
  return value >= 70 ? high[metric] : mid[metric] || METRIC_NAMES[metric];
}

function openLabelDetail(result) {
  openDetail({
    type: "结构标签",
    title: result.labelDetails.name,
    subtitle: result.labelDetails.plainMeaning,
    sections: [
      ["这是什么意思", result.labelDetails.plainMeaning],
      ["为什么你可能是这个标签", `系统在 ${result.signals.slice(0, 3).map((s) => s.name).join("、")} 上看到了较强信号。`],
      ["容易被误解成什么", "它不是给你贴永久人格标签，而是描述本次回答里最突出的判断结构。"],
      ["怎么提升含活人量", result.labelDetails.shareLine || "把隐性判断说清楚，让经验能够被追溯、被校准。"],
    ],
  });
}

function openDimensionDetail(index) {
  detailContext.activeIndex = index;
  const dimension = detailContext.dimensions[index];
  const detail = DIMENSION_DETAILS[dimension.key] || {
    subtitle: METRIC_NAMES[dimension.key],
    meaning: "这个维度用于理解你当前判断结构的一部分。",
    evidence: "系统会结合多道题的选择来估计它。",
    growth: "持续复盘自己的选择依据会让这个维度更稳定。",
  };
  openDetail({
    type: "核心维度",
    title: `${dimension.name} ${dimension.value}%`,
    subtitle: detail.subtitle,
    sections: [
      ["这是什么意思", detail.meaning],
      ["为什么你可能是这个表现", detail.evidence],
      ["怎么提升含活人量", detail.growth],
    ],
    next: true,
  });
}

function openMethodDetail() {
  openDetail({
    type: "测试逻辑",
    title: "这套测试在看什么",
    subtitle: "它不是按选项位置给分，而是在看你的判断结构能不能低损耗复制。",
    sections: [
      ["六个观察面", "系统从情境辨识、边界校准、生成重构、审美判别、价值定向和经验内化六个维度观察你的选择。"],
      ["为什么会动态追问", "先做覆盖式初筛，再根据低置信度维度、标签分叉和可能误读的地方追加追问；达到稳定条件后停止。"],
      ["结果怎么理解", "含活人量越高，不代表越厉害，而是表示你的关键判断越难被流程、模板或 AI 低损耗复制。"],
      ["适用边界", "结果适合自我理解和讨论，不用于招聘、医疗、心理诊断或人格定论。"],
    ],
  });
}

function openDetail(content) {
  closeDetail();
  const fragment = templates.detail.content.cloneNode(true);
  document.body.append(fragment);
  document.body.classList.add("is-detail-open");
  document.querySelector("#detailType").textContent = content.type;
  document.querySelector("#detailTitle").textContent = content.title;
  document.querySelector("#detailSubtitle").textContent = content.subtitle;
  const sectionRoot = document.querySelector("#detailSections");
  for (const [heading, body] of content.sections) {
    const section = document.createElement("section");
    section.innerHTML = `<h3>${heading}</h3><p>${body}</p>`;
    sectionRoot.append(section);
  }
  document.querySelector("#detailCloseButton").addEventListener("click", closeDetail);
  document.querySelector("#detailBackdrop").addEventListener("click", (event) => {
    if (event.target.id === "detailBackdrop") closeDetail();
  });
  activeDetailEscapeHandler = (event) => {
    if (event.key === "Escape") closeDetail();
  };
  document.addEventListener("keydown", activeDetailEscapeHandler);
  const nextButton = document.querySelector("#detailNextButton");
  nextButton.hidden = !content.next;
  nextButton.addEventListener("click", () => {
    const next = (detailContext.activeIndex + 1) % detailContext.dimensions.length;
    closeDetail();
    openDimensionDetail(next);
  });
}

function closeDetail() {
  document.querySelector("#detailBackdrop")?.remove();
  document.body.classList.remove("is-detail-open");
  if (activeDetailEscapeHandler) {
    document.removeEventListener("keydown", activeDetailEscapeHandler);
    activeDetailEscapeHandler = undefined;
  }
}

async function copyResult() {
  if (!latestResult) return;
  const text = `我做了抗蒸性测试：含活人量 ${latestResult.score}%｜${latestResult.band.name}｜结构标签：${latestResult.labelDetails.name}。${latestResult.labelDetails.shareLine || latestResult.labelDetails.plainMeaning}`;
  const button = document.querySelector("#copyButton");
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "已复制";
  } catch {
    button.textContent = "复制失败，请手动选择结果";
  }
  setTimeout(() => {
    button.textContent = "复制结果摘要";
  }, 1600);
}

async function boot() {
  try {
    const config = await loadConfig();
    assessment = new AdaptiveAssessment(config);
    restartTopButton.addEventListener("click", renderStart);
    learnTopButton.addEventListener("click", renderLearn);
    renderStart();
  } catch (error) {
    app.innerHTML = `
      <section class="error-state">
        <h1>测试暂时无法加载</h1>
        <p>${error.message}</p>
        <button class="primary-button" type="button" onclick="location.reload()">刷新重试</button>
      </section>
    `;
  }
}

boot();
