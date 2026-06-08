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
    subtitle: "识别关键变量与隐含约束的敏锐度。",
    meaning: "情境辨识看的是你能不能发现话外信息、关系结构、时机和隐含约束，而不是只照字面任务行动。",
    evidence: "分数较高时，你通常会先判断这件事真正影响谁、风险在哪里、哪些条件没有被说出口。",
    misunderstanding: "它不是想太多，也不是故意复杂化问题，而是在复杂场景里减少误用流程的损耗。",
    growth: "练习在接到任务后多问一句：这里没说出口的约束是什么？谁会受影响？",
  },
  BND: {
    subtitle: "知道方法、流程和 AI 输出什么时候会失效。",
    meaning: "边界校准看的是你对模板、流程、AI 输出和经验方法的适用范围判断。",
    evidence: "分数较高时，你不是反流程，而是知道什么时候该照做，什么时候必须停下来重判。",
    misunderstanding: "它不是保守，也不是拖慢效率，而是避免把标准答案用到非标准场景里。",
    growth: "每次复盘时记录一个“这套方法不适用”的场景，并写清楚失效条件。",
  },
  GEN: {
    subtitle: "把问题改准，而不只是把题答完。",
    meaning: "生成重构看的是你能不能把模糊、空泛或方向错的问题改写成真正值得解决的问题。",
    evidence: "分数较高时，你会先修正问题定义，再进入方案产出。",
    misunderstanding: "它不是脑洞大，而是能把复杂信息重新组织成可行动的结构。",
    growth: "在做方案前先写下：如果题目本身问错了，它错在哪里？",
  },
  TST: {
    subtitle: "分辨完整外壳下有没有真实判断。",
    meaning: "审美判别看的是你能不能识别顺滑、专业、结构完整但缺少取舍的内容。",
    evidence: "分数较高时，你能看出漂亮话、空心专业感和没有对象感的表达。",
    misunderstanding: "它不是挑剔，而是对风格、语境和质量的稳定判别。",
    growth: "评价一个方案时，不只问对不对，也问它有没有明确取舍和真实对象。",
  },
  STN: {
    subtitle: "面对目标仍然保留价值取向。",
    meaning: "价值定向看的是目标、效率和风险冲突时，你是否能说清楚不能牺牲什么。",
    evidence: "分数较高时，你不只完成目标，也会判断目标本身是否值得照单全收。",
    misunderstanding: "它不是唱高调，而是在长期成本和短期收益之间保持清醒。",
    growth: "为重要工作写一条“我不愿牺牲的东西”，并把它转成可执行边界。",
  },
  GRD: {
    subtitle: "让经历沉淀成可解释的判断。",
    meaning: "经验内化看的是你的判断是否能追溯到真实案例、失败、长期观察或校准过程。",
    evidence: "分数较高时，你的直觉不是玄学，而是经验被压缩后的判断。",
    misunderstanding: "它不是资历崇拜；没有复盘的年头，只会变成经验固化。",
    growth: "把一个直觉判断补成：我为什么这么想？来自哪次经验？什么时候可能不适用？",
  },
};

let assessment;
let assetMap = {};
let latestResult;
let answerHistory = [];
let detailContext = { dimensions: [], activeIndex: 0, result: null };
let activeDetailEscapeHandler;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadJson(path, errorMessage) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(errorMessage);
  return response.json();
}

async function loadConfig() {
  return loadJson("./data/game-config.json", "无法加载测评配置");
}

async function loadAssetMap() {
  return loadJson("./assets/ui-art/asset-map.json", "无法加载视觉资产");
}

function assetPath(path) {
  return path ? `./${path}` : "";
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
  document.querySelector("#calibrationContinueButton").addEventListener("click", () => {
    const roleContext = collectRoleContext();
    if (!roleContext) return;
    startAssessment(roleContext);
  });
  document.querySelector("#calibrationSkipButton").addEventListener("click", () => startAssessment({ skipped: true }));
}

function collectRoleContext() {
  const form = document.querySelector("#roleForm");
  if (!form) return {};
  const data = new FormData(form);
  const context = {
    taskShape: data.get("taskShape") || "",
    aiExposure: data.get("aiExposure") || "",
    sopHardPart: data.get("sopHardPart") || "",
  };
  const answered = Object.values(context).filter(Boolean).length;
  if (answered === 0) {
    form.classList.add("needs-answer");
    form.setAttribute("aria-invalid", "true");
    return null;
  }
  return context;
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
  const phase = stageDisplayText(progress);
  document.querySelector("#phaseLabel").textContent = phase;
  document.querySelector("#mobilePhaseLabel").textContent = phase;
  document.querySelector("#questionText").textContent = item.question;
  document.querySelector("#sectionIntro").textContent = progress.intro;
  document.querySelector("#densityText").textContent = densityText(progress.answered);
  renderProgressDots(progress);

  const backButton = document.querySelector("#backButton");
  const mobileBackButton = document.querySelector("#mobileBackButton");
  for (const button of [backButton, mobileBackButton]) {
    button.disabled = answerHistory.length === 0;
    button.addEventListener("click", goBackOneQuestion);
  }
  document.querySelector("#quizLearnButton").addEventListener("click", renderLearn);
  document.querySelector("#quizRestartButton").addEventListener("click", renderStart);
  document.querySelector("#mobileMenuButton").addEventListener("click", renderLearn);

  const optionList = document.querySelector("#optionList");
  for (const option of assessment.orderedOptions(item)) {
    const button = document.createElement("button");
    button.className = "option-button";
    button.type = "button";
    button.innerHTML = `<span>${option.text}</span><i aria-hidden="true"></i>`;
    button.addEventListener("click", () => handleAnswer(button, option.key));
    optionList.append(button);
  }
}

function stageDisplayText(progress) {
  if (progress.stage === "screening") return "正在初筛人味";
  if (progress.stage === "split") return "正在追问分叉";
  if (progress.stage === "countercheck") return "正在排除误读";
  if (progress.answered >= 14) return "接近完成";
  return "正在追问边界";
}

function densityText(answered) {
  if (answered < 8) return "较轻";
  if (answered < 16) return "中等";
  return "较浓";
}

function renderProgressDots(progress) {
  const dots = document.querySelector("#progressDots");
  const total = Math.max(16, Math.min(22, assessment.flow?.targetAverageQuestions || 18));
  for (let index = 0; index < total; index += 1) {
    const dot = document.createElement("span");
    dot.className = index < progress.answered ? "done" : "";
    dot.title = index < progress.answered ? "已完成" : "待追问";
    dots.append(dot);
  }
  const count = document.createElement("strong");
  count.textContent = `已完成 ${progress.answered} 题`;
  dots.prepend(count);
}

function goBackOneQuestion() {
  const snapshot = answerHistory.pop();
  if (!snapshot) return;
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
  await sleep(180);
  const result = assessment.answerCurrent(optionKey);
  if (result) renderResult(result);
  else renderQuestion();
}

function renderResult(result) {
  latestResult = result;
  detailContext.result = result;
  mount("result", resultSmokeTier(result.score));
  setTopbar("result");

  document.querySelector("#scoreValue").textContent = result.score;
  document.querySelector("#scoreHelp").textContent = scoreHelpText(result.score);
  document.querySelector("#bandName").textContent = result.band.name;
  document.querySelector("#bandLine").textContent = result.band.line;
  document.querySelector("#bandRoast").textContent = bandRoastText(result);
  document.querySelector("#shareLine").textContent = buildShareLine(result);
  document.querySelector("#shareHash").textContent = `#我的含活人量${result.score}% #${result.band.name}`;
  document.querySelector("#reasoningText").textContent = buildReasoningText(result);

  const bandBadge = document.querySelector("#bandBadge");
  bandBadge.src = assetPath(assetMap.resultBands?.[result.band.name]);
  bandBadge.alt = `${result.band.name}徽章`;

  const labelBadge = document.querySelector("#labelBadge");
  labelBadge.src = assetPath(assetMap.labels?.[result.labelKey] || fallbackLabelAsset(result.labelDetails.name));
  labelBadge.alt = `${result.labelDetails.name}徽章`;
  document.querySelector("#labelName").textContent = result.labelDetails.name;
  document.querySelector("#labelMeaning").textContent = result.labelDetails.plainMeaning;
  document.querySelector("#labelDetailButton").addEventListener("click", () => openLabelDetail(result));

  renderRoleResult(result);
  renderDimensions(result);
  renderSignals(result);

  document.querySelector("#restartButton").addEventListener("click", renderStart);
  document.querySelector("#copyButton").addEventListener("click", copyResult);
  document.querySelector("#methodButton").addEventListener("click", openMethodDetail);
}

function resultSmokeTier(score) {
  if (score >= 80) return "result-rich";
  if (score >= 60) return "result-mid";
  if (score >= 40) return "result-soft";
  return "result-low";
}

function fallbackLabelAsset(name = "") {
  if (name.includes("边界")) return assetMap.labels?.boundary_radar;
  if (name.includes("审美") || name.includes("空话")) return assetMap.supplementalTags?.aesthetic;
  if (name.includes("重构") || name.includes("生成")) return assetMap.supplementalTags?.reconstruction;
  if (name.includes("执行")) return assetMap.supplementalTags?.execution;
  return assetMap.labels?.latent_human_variable;
}

function renderRoleResult(result) {
  const panel = document.querySelector("#rolePanel");
  const roleText = result.role || "";
  const skipped = roleText.includes("跳过") || roleText.includes("没有填写");
  if (skipped) {
    panel.hidden = true;
    panel.closest(".result-page")?.classList.add("no-role");
    document.querySelector(".result-page")?.classList.add("no-role");
    return;
  }
  panel.closest(".result-page")?.classList.remove("no-role");
  document.querySelector(".result-page")?.classList.remove("no-role");
  document.querySelector("#roleTitle").textContent = roleText.includes("偏低") ? "中等偏低" : roleText.includes("偏高") ? "高" : "中等";
  document.querySelector("#roleResult").textContent = roleText;
}

function renderDimensions(result) {
  const dimensionList = document.querySelector("#dimensionList");
  detailContext.dimensions = result.dimensions;
  for (const [index, dimension] of result.dimensions.entries()) {
    const button = document.createElement("button");
    button.className = `dimension-row dimension-${dimension.key}`;
    button.type = "button";
    button.innerHTML = `
      <span class="metric-symbol" data-metric="${dimension.key}" aria-hidden="true"></span>
      <span class="dimension-copy">
        <strong>${dimension.name}</strong>
        <small>${dimensionCopy(dimension.key, dimension.value)}</small>
      </span>
      <span class="dimension-track"><i style="width:${dimension.value}%"></i></span>
      <b>${dimension.value}%</b>
    `;
    button.addEventListener("click", () => openDimensionDetail(index));
    dimensionList.append(button);
  }
}

function renderSignals(result) {
  const signalList = document.querySelector("#signalList");
  const chips = [`完成 ${result.answeredCount} 题后停止`];
  chips.push(stabilityCopy(result.stabilityLevel));
  chips.push(...(result.openRisks || []).map(riskCopy));
  chips.push(...result.signals.slice(0, 4).map((signal) => `${signal.name} ${signal.value}%`));

  for (const text of chips) {
    const chip = document.createElement("span");
    chip.className = text.includes("校验") || text.includes("摇摆") ? "signal-chip warn" : "signal-chip";
    chip.textContent = text;
    signalList.append(chip);
  }
}

function stabilityCopy(level) {
  const copy = {
    stable: "判断路径稳定",
    path_stable: "路径基本稳定",
    label_swing: "标签轻微摇摆",
    risk_pending: "风险待反证",
    forced_at_24: "追问到上限",
    light_swing: "结果有轻微摇摆",
  };
  return copy[level] || "路径基本稳定";
}

function buildReasoningText(result) {
  const top = result.signals.slice(0, 2).map((signal) => signal.name).join("、");
  const low = result.dimensions
    .filter((dimension) => dimension.value < 48)
    .map((dimension) => dimension.name)
    .slice(0, 2)
    .join("、");
  if (low) {
    return `系统主要在${top}上看到有效信号，同时${low}还有成长空间。这个百分比不是人格定论，而是对当前判断结构的快照。`;
  }
  return `系统主要在${top}上看到稳定信号。动态追问的作用，是确认这些信号不是偶然选择，而是在多个场景中反复出现。`;
}

function scoreHelpText(score) {
  if (score >= 80) return "含活人量越高，越难被低损耗蒸馏成流程或同事技能。";
  if (score >= 60) return "你的流程能被学走，但例外、边界和取舍还得本人校准。";
  if (score >= 40) return "你有一部分适合沉淀成 Skill，也有判断正在长出来。";
  return "你很适合标准化复制，下一步是把经验从步骤里拎出来。";
}

function bandRoastText(result) {
  const label = result.labelDetails?.name || "判断结构";
  if (result.score >= 80) return `蒸馏瓶已经开始冒彩烟：${label}这块，复制品容易只学到姿势，学不到手感。`;
  if (result.score >= 60) return "你不是反流程的人，但流程遇到你会有点紧张：关键时候还得问一句“本人怎么看”。";
  if (result.score >= 40) return "目前是“能蒸，但别蒸太干”的状态：标准动作可交给工具，判断部分建议留给自己。";
  return "你很适合做成高质量 SOP，但别急着把自己全交出去：先把几个真实判断点养肥。";
}

function buildShareLine(result) {
  return `我不是不配合流程，而是知道流程什么时候会失效。`;
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
    CXT: "看你发现事物复杂性的敏锐度",
    BND: "看你对边界与误识别例外的能力",
    GEN: "看你把信息重组为有效方案的能力",
    TST: "看你对质感、风格与细节的鉴别力",
    STN: "看你在取舍中坚守的原则与取向",
    GRD: "看你把经验提炼为直觉的能力",
  };
  const mid = {
    CXT: "有场景感，但偶尔会被表面任务带走",
    BND: "能意识到边界，还可以更快说清依据",
    GEN: "能提出方案，也可以继续练习改题能力",
    TST: "能察觉不对劲，判断语言还可更稳定",
    STN: "有底线感，下一步是把底线转成动作",
    GRD: "经验正在积累，还需要更多复盘变成方法",
  };
  return value >= 70 ? high[metric] : mid[metric] || METRIC_NAMES[metric];
}

function openLabelDetail(result) {
  openDetail({
    type: "结构标签",
    title: result.labelDetails.name,
    subtitle: result.labelDetails.plainMeaning,
    asset: assetPath(assetMap.labels?.[result.labelKey] || fallbackLabelAsset(result.labelDetails.name)),
    sections: [
      ["这是什么意思", result.labelDetails.plainMeaning],
      ["为什么你可能是这个标签", `系统在 ${result.signals.slice(0, 3).map((s) => s.name).join("、")} 上看到了较强信号。`],
      ["容易被误解成什么", "它不是给你贴永久人格标签，而是描述本次回答里最突出的判断结构。"],
      ["怎么提升含活人量", result.labelDetails.shareLine || "把隐性判断说清楚，让经验能够被追溯、被校准。"],
      ["本次表现证据", `系统还参考了 ${result.labelCandidates?.join("、") || "候选标签"}，避免单一标签把复杂回答吞掉。`],
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
    misunderstanding: "它不是人格定论。",
    growth: "持续复盘自己的选择依据会让这个维度更稳定。",
  };
  openDetail({
    type: "核心维度",
    title: `${dimension.name} ${dimension.value}%`,
    subtitle: detail.subtitle,
    asset: assetPath(dimensionAsset(dimension.key)),
    sections: [
      ["这是什么意思", detail.meaning],
      ["为什么你可能是这个表现", detail.evidence],
      ["容易被误解成什么", detail.misunderstanding],
      ["怎么提升含活人量", detail.growth],
      ["本次表现证据", `这个维度在本次回答中的估计值为 ${dimension.value}%，会和其他维度一起影响总结果。`],
    ],
    next: true,
  });
}

function dimensionAsset(metric) {
  const map = {
    CXT: assetMap.labels?.context_reader,
    BND: assetMap.labels?.boundary_radar,
    GEN: assetMap.supplementalTags?.reconstruction || assetMap.labels?.generative_reframer,
    TST: assetMap.supplementalTags?.aesthetic || assetMap.labels?.empty_professional_detector,
    STN: assetMap.labels?.value_low_generation,
    GRD: assetMap.labels?.grounded_experience,
  };
  return map[metric] || assetMap.labels?.latent_human_variable;
}

function openMethodDetail() {
  openDetail({
    type: "测试逻辑",
    title: "这套测试在看什么",
    subtitle: "它不是按选项位置给分，而是在看你的判断结构能不能低损耗复制。",
    asset: assetPath(assetMap.global?.sparkleSeal),
    sections: [
      ["六个观察面", "系统从情境辨识、边界校准、生成重构、审美判别、价值定向和经验内化六个维度观察你的选择。"],
      ["为什么会动态追问", "先做覆盖式初筛，再根据低置信度维度、标签分叉和可能误读的地方追加追问；达到稳定条件后停止。"],
      ["结果怎么理解", "含活人量越高，不代表越厉害，而是表示你的关键判断越难被工作流、插件、模板或 AI 低损耗复制。"],
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
  const asset = document.querySelector("#detailAsset");
  asset.src = content.asset || assetPath(assetMap.smoke?.drawerHeader);
  asset.alt = "";
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
    button.textContent = "复制失败";
  }
  setTimeout(() => {
    button.textContent = "分享结果";
  }, 1600);
}

async function boot() {
  try {
    const [config, assets] = await Promise.all([loadConfig(), loadAssetMap()]);
    assetMap = assets;
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
