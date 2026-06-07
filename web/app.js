import { AdaptiveAssessment, METRIC_NAMES } from "./adaptive-engine.js";

const app = document.querySelector("#app");
const restartTopButton = document.querySelector("#restartTopButton");
const templates = {
  start: document.querySelector("#startTemplate"),
  question: document.querySelector("#questionTemplate"),
  result: document.querySelector("#resultTemplate"),
};

let assessment;
let latestResult;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadConfig() {
  const response = await fetch("./data/game-config.json", { cache: "no-store" });
  if (!response.ok) throw new Error("无法加载测评配置");
  return response.json();
}

function mount(templateName) {
  app.replaceChildren(templates[templateName].content.cloneNode(true));
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

function renderStart() {
  mount("start");
  restartTopButton.hidden = true;
  document.querySelector("#startButton").addEventListener("click", () => {
    assessment.start(collectRoleContext());
    renderQuestion();
  });
}

function renderQuestion() {
  const item = assessment.currentItem;
  if (!item) {
    renderResult(assessment.result());
    return;
  }

  mount("question");
  restartTopButton.hidden = false;
  const progress = assessment.progress;
  document.querySelector("#phaseLabel").textContent = progress.label;
  document.querySelector("#questionText").textContent = item.question;
  document.querySelector("#progressText").textContent = `${progress.answered} 题已回答`;
  document.querySelector("#progressBar").style.width = `${progress.percent}%`;
  document.querySelector("#sectionIntro").textContent = progress.intro;

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

async function handleAnswer(button, optionKey) {
  const options = [...document.querySelectorAll(".option-button")];
  options.forEach((option) => {
    option.disabled = true;
    option.classList.toggle("is-selected", option === button);
  });
  await sleep(180);
  const result = assessment.answerCurrent(optionKey);
  if (result) renderResult(result);
  else renderQuestion();
}

function renderResult(result) {
  latestResult = result;
  mount("result");
  restartTopButton.hidden = false;

  document.querySelector("#scoreValue").textContent = result.score;
  document.querySelector("#bandName").textContent = result.band.name;
  document.querySelector("#bandLine").textContent = result.band.line;
  document.querySelector("#labelName").textContent = result.labelDetails.name;
  document.querySelector("#labelMeaning").textContent = result.labelDetails.plainMeaning;
  document.querySelector("#reasoningText").textContent = buildReasoningText(result);
  document.querySelector("#candidateText").textContent = buildCandidateText(result);
  document.querySelector("#roleResult").textContent = result.role;

  renderDimensions(result);
  renderSignals(result);

  document.querySelector("#restartButton").addEventListener("click", renderStart);
  document.querySelector("#copyButton").addEventListener("click", copyResult);
}

function renderDimensions(result) {
  const dimensionList = document.querySelector("#dimensionList");
  for (const dimension of result.dimensions) {
    const row = document.createElement("div");
    row.className = "dimension-row";
    row.innerHTML = `
      <div class="dimension-head">
        <span>${dimension.name}</span>
        <strong>${dimension.value}</strong>
      </div>
      <div class="dimension-track"><span style="width:${dimension.value}%"></span></div>
      <p>${dimensionCopy(dimension.key, dimension.value)}</p>
    `;
    dimensionList.append(row);
  }
}

function renderSignals(result) {
  const signalList = document.querySelector("#signalList");
  const answeredText = document.createElement("div");
  answeredText.className = "signal-chip";
  answeredText.textContent = `本次完成 ${result.answeredCount} 题后停止`;
  signalList.append(answeredText);

  if (result.stabilityLevel === "light_swing") {
    const chip = document.createElement("div");
    chip.className = "signal-chip signal-chip-warn";
    chip.textContent = "结果有轻微摇摆";
    signalList.append(chip);
  }

  for (const risk of result.openRisks || []) {
    const chip = document.createElement("div");
    chip.className = "signal-chip signal-chip-warn";
    chip.textContent = riskCopy(risk);
    signalList.append(chip);
  }

  for (const signal of result.signals) {
    const chip = document.createElement("div");
    chip.className = "signal-chip";
    chip.textContent = `${signal.name} ${signal.value}`;
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
    return `你的含活人量主要来自${top}上的有效信号，同时${low}还有成长空间。这个分数不是人格定论，而是对当前判断结构的快照。`;
  }
  return `你的含活人量主要来自${top}上的稳定信号。后续追问的作用，是确认这些信号不是偶然选择，而是在多个场景中反复出现。`;
}

function buildCandidateText(result) {
  const candidates = result.labelCandidates || [];
  if (!candidates.length) return "系统已经给出主标签；候选标签不足以形成额外解释。";
  return `主标签之外，系统还参考了 ${candidates.join("、")} 等候选结构。V10.10 会用候选和风险校验避免单一标签把复杂回答吞掉。`;
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

async function copyResult() {
  if (!latestResult) return;
  const text = `我做了抗蒸性测试：含活人量 ${latestResult.score}分｜${latestResult.band.name}｜结构标签：${latestResult.labelDetails.name}。${latestResult.labelDetails.shareLine || latestResult.labelDetails.plainMeaning}`;
  await navigator.clipboard.writeText(text);
  const button = document.querySelector("#copyButton");
  button.textContent = "已复制";
  setTimeout(() => {
    button.textContent = "复制结果摘要";
  }, 1600);
}

async function boot() {
  try {
    const config = await loadConfig();
    assessment = new AdaptiveAssessment(config);
    restartTopButton.addEventListener("click", renderStart);
    renderStart();
  } catch (error) {
    app.innerHTML = `
      <section class="error-state">
        <h1>测评暂时无法加载</h1>
        <p>${error.message}</p>
        <button class="primary-button" type="button" onclick="location.reload()">刷新重试</button>
      </section>
    `;
  }
}

boot();
