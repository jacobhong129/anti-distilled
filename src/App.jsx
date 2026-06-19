import { useEffect, useMemo, useRef, useState } from "react";
import assetMap from "./data/asset-map.json";
import { AdaptiveAssessment } from "./engine/adaptive-engine.js";

const STORAGE_KEY = "anti-distilled-session-v2";
const CONFIG_PATH = "data/game-config.json";

const VIEW_STEP = {
  home: 0,
  theory: 0,
  work: 1,
  question: 2,
  result: 3,
};

const DIMENSION_DETAILS = {
  CXT: {
    name: "情境辨识",
    subtitle: "看你发现事物复杂性的敏锐度",
    color: "#7b65d0",
    assetKey: "context_reader",
    meaning: "你能不能读出场景里真正起作用的人、关系、时机、隐含约束和真实目标。",
    evidence: "高分通常来自能先确认语境、识别风险关系、追问真实目标的选择。",
    misunderstanding: "它不是“会做人”或“会猜老板”，而是知道一个方法在什么场景下才成立。",
    growth: "把每次判断写成“场景-约束-风险-可行动作”，让直觉能被复盘。",
  },
  BND: {
    name: "边界校准",
    subtitle: "看你对流程和工具适用范围的判断",
    color: "#5f8fd8",
    assetKey: "boundary_radar",
    meaning: "你能不能看出流程、模板、AI 输出、旧经验什么时候会失效，以及需要人来停一下的位置。",
    evidence: "高分常见于能提出条件、边界、替代方案和后果判断的选择。",
    misunderstanding: "它不是保守，也不是反效率，而是不让工具在错误地方高效犯错。",
    growth: "练习给每个方法加一条“不适用清单”，尤其写清楚何时必须人工确认。",
  },
  GEN: {
    name: "生成重构",
    subtitle: "看你把问题改造成有效方案的能力",
    color: "#6fc3bc",
    assetKey: "generative_reframer",
    meaning: "你不是只完成题目，而是能把空泛任务改成更值得做、更可执行的问题。",
    evidence: "高分来自能重写目标、清理噪声、调整路径、提出可测试方案的选择。",
    misunderstanding: "它不是点子多，也不是会写 prompt，而是知道原题哪里不对。",
    growth: "每次接需求时先写“原题的问题是什么”，再写“我真正要解决什么”。",
  },
  TST: {
    name: "审美判别",
    subtitle: "看你识别空话、风格和结构的能力",
    color: "#f0a25f",
    assetKey: "empty_professional_detector",
    meaning: "你能不能看出漂亮表达、完整框架或高密度术语背后有没有真实取舍。",
    evidence: "高分通常会指出哪里空、哪里过度包装、哪里与对象不匹配。",
    misunderstanding: "它不是挑剔，也不是审美洁癖，而是对“看起来专业但没有判断”的免疫力。",
    growth: "对每个漂亮方案追问一句：它到底删掉了什么、保留了什么、为什么。",
  },
  STN: {
    name: "价值定向",
    subtitle: "看你在取舍中守住原则的能力",
    color: "#de6f91",
    assetKey: "value_low_generation",
    meaning: "你知道哪些东西不能为了效率、短期收益或顺滑协作被牺牲。",
    evidence: "高分来自能说明代价、责任、底线，并给出更可执行替代方案的选择。",
    misunderstanding: "它不是道德姿态，也不是说“不行”，而是把底线翻译成可操作边界。",
    growth: "为重要工作写一条“我不愿牺牲的东西”，并把它转成执行规则。",
  },
  GRD: {
    name: "经验内化",
    subtitle: "看你把经历变成判断材料的能力",
    color: "#84bd8d",
    assetKey: "grounded_experience",
    meaning: "你的判断是否来自真实案例、失败经验、长期观察和可复盘的校准过程。",
    evidence: "高分常见于能说出经验来源、适用条件、失败边界和更新方式的选择。",
    misunderstanding: "它不是资历久，也不是凭感觉，而是经验已经被压缩成可用判断。",
    growth: "把一个直觉判断补成：来自哪次经验？什么时候成立？什么时候可能不成立？",
  },
};

const DIMENSION_ICON_SYMBOLS = {
  CXT: "dimension-context",
  BND: "dimension-boundary",
  GEN: "dimension-reconstruct",
  TST: "dimension-aesthetic",
  STN: "dimension-value",
  GRD: "dimension-internalize",
};

const ROLE_FIELDS = [
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

function publicAsset(path) {
  if (!path) return "";
  const base = import.meta.env.BASE_URL || "./";
  return `${base}${path.replace(/^\.\//, "")}`;
}

function resultSmokePath(score) {
  if (score >= 75) return assetMap.smoke.scoreHigh;
  if (score >= 52) return assetMap.smoke.scoreMid;
  return assetMap.smoke.scoreLow;
}

function resultTone(score) {
  if (score >= 80) return "high";
  if (score >= 52) return "mid";
  return "low";
}

function scoreHelpText(score) {
  if (score >= 90) return "蒸馏损耗极高，真人密度很难被完整复制。";
  if (score >= 80) return "可被学习，但关键判断仍需要本人到场。";
  if (score >= 70) return "流程能抄，例外和分寸会漏出人味。";
  if (score >= 52) return "一部分适合沉淀成 Skill，一部分仍需要人工校准。";
  if (score >= 35) return "稳定可靠，适合流程化；个人判断还需要继续显性化。";
  return "很好标准化，也很适合反向补充判断来源。";
}

function bandRoastText(result) {
  const label = result.labelDetails?.name || "判断结构";
  if (result.score >= 90) return `蒸馏瓶已经开始冒彩烟：${label}这块，复制品学得到话术，学不到手感。`;
  if (result.score >= 80) return `你不是不能总结，而是总结完还少一口气：${label}需要本人在场。`;
  if (result.score >= 70) return "你不是反流程的人，但流程遇到你会有点紧张：关键时候还得问一句“本人怎么看”。";
  if (result.score >= 62) return "招牌已经有雏形，只是还没稳定到让复制品每次都露馅。";
  if (result.score >= 52) return "目前是“能蒸，但别蒸太干”：标准动作交给工具，判断部分建议留给自己。";
  if (result.score >= 48) return "你像一个适合协作的原型机：好对齐、好交付，个人锋利度还可以再磨。";
  if (result.score >= 35) return "高质量 SOP 会喜欢你。下一步不是反流程，而是在流程里养出几个真实判断点。";
  return "蒸馏瓶表示满意：可靠、好用、好复制。下一步是给经验加一点不可替代的出处。";
}

function buildShareLine(result) {
  return `我做了抗蒸性测试：含活人量 ${result.score}%｜${result.band.name}｜结构标签：${result.labelDetails.name}。${result.labelDetails.shareLine || result.labelDetails.plainMeaning}`;
}

function useGameConfig() {
  const [state, setState] = useState({ config: null, error: null });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(publicAsset(CONFIG_PATH), { cache: "no-cache" });
        if (!response.ok) throw new Error(`Config request failed: ${response.status}`);
        const config = await response.json();
        if (!cancelled) setState({ config, error: null });
      } catch (error) {
        if (!cancelled) setState({ config: null, error });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

function useAssessmentFlow(gameConfig) {
  const engineRef = useRef(new AdaptiveAssessment(gameConfig));
  const [view, setView] = useState("home");
  const [currentItem, setCurrentItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [roleContext, setRoleContext] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved) return;
      const engine = new AdaptiveAssessment(gameConfig);
      if (saved.snapshot && saved.view === "question") {
        engine.restoreSnapshot(saved.snapshot);
        engineRef.current = engine;
        setHistory(saved.history || []);
        setRoleContext(saved.roleContext || null);
        setCurrentItem(engine.currentItem || null);
        setView("question");
      } else if (saved.view === "result" && saved.result) {
        engineRef.current = engine;
        setRoleContext(saved.roleContext || null);
        setResult(saved.result);
        setView("result");
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [gameConfig]);

  useEffect(() => {
    try {
      if (view === "question" && currentItem) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            view,
            roleContext,
            history,
            snapshot: engineRef.current.getSnapshot(),
          })
        );
      } else if (view === "result" && result) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ view, roleContext, result }));
      }
    } catch {
      // Local storage is a convenience only. The test remains fully usable without it.
    }
  }, [view, currentItem, history, roleContext, result]);

  const startAssessment = (context) => {
    const engine = new AdaptiveAssessment(gameConfig);
    engineRef.current = engine;
    const firstItem = engine.start(context);
    setRoleContext(context);
    setHistory([]);
    setResult(null);
    setCurrentItem(firstItem);
    setView("question");
  };

  const answer = (optionKey) => {
    const engine = engineRef.current;
    const snapshot = engine.getSnapshot();
    const nextResult = engine.answerCurrent(optionKey);
    setHistory((items) => [...items, snapshot]);
    if (nextResult) {
      setResult(nextResult);
      setCurrentItem(null);
      setView("result");
      return;
    }
    setCurrentItem(engine.currentItem);
  };

  const previous = () => {
    setHistory((items) => {
      const next = [...items];
      const snapshot = next.pop();
      if (!snapshot) return items;
      engineRef.current.restoreSnapshot(snapshot);
      setResult(null);
      setCurrentItem(engineRef.current.currentItem);
      setView("question");
      return next;
    });
  };

  const restart = () => {
    localStorage.removeItem(STORAGE_KEY);
    engineRef.current = new AdaptiveAssessment(gameConfig);
    setCurrentItem(null);
    setHistory([]);
    setRoleContext(null);
    setResult(null);
    setView("home");
  };

  return {
    engine: engineRef.current,
    view,
    setView,
    currentItem,
    history,
    roleContext,
    result,
    startAssessment,
    answer,
    previous,
    restart,
  };
}

function App() {
  const { config, error } = useGameConfig();

  if (!config) {
    return <AppStatus error={error} />;
  }

  return <AssessmentApp config={config} />;
}

function AssessmentApp({ config }) {
  const flow = useAssessmentFlow(config);
  const [menuOpen, setMenuOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const progress = flow.engine.progress;
  const activeStep = VIEW_STEP[flow.view] ?? 0;
  const tone = flow.result ? resultTone(flow.result.score) : flow.view;

  useEffect(() => {
    setMenuOpen(false);
    setDetail(null);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.title = flow.view === "result" ? "我的含活人量结果｜抗蒸性测试" : "抗蒸性测试";
  }, [flow.view]);

  const content = useMemo(() => {
    if (flow.view === "theory") {
      return <TheoryPage onBack={() => flow.setView("home")} onStart={() => flow.setView("work")} />;
    }
    if (flow.view === "work") {
      return <WorkContextPage onSubmit={flow.startAssessment} onSkip={() => flow.startAssessment({ skipped: true })} />;
    }
    if (flow.view === "question") {
      return (
        <QuestionPage
          currentItem={flow.currentItem}
          engine={flow.engine}
          history={flow.history}
          progress={progress}
          onAnswer={flow.answer}
          onPrevious={flow.previous}
          onRestart={flow.restart}
        />
      );
    }
    if (flow.view === "result" && flow.result) {
      return (
        <ResultPage
          result={flow.result}
          onRestart={flow.restart}
          onOpenDetail={setDetail}
        />
      );
    }
    return <HomePage onStart={() => flow.setView("work")} onLearn={() => flow.setView("theory")} />;
  }, [flow, progress]);

  return (
    <div className={`app-shell view-${flow.view} tone-${tone}`}>
      <SmokeBackdrop view={flow.view} score={flow.result?.score} />
      <BrandHeader
        view={flow.view}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((value) => !value)}
        onHome={flow.restart}
        onLearn={() => flow.setView("theory")}
        onStart={() => flow.setView("work")}
      />
      {flow.view !== "home" && flow.view !== "theory" && <StepIndicator active={activeStep} />}
      <main>{content}</main>
      <FooterSignature />
      {detail && <ResultDetailDrawer detail={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function AppStatus({ error }) {
  return (
    <div className="app-shell view-home">
      <SmokeBackdrop view="home" />
      <main>
        <section className="app-status page-frame">
          <img src={publicAsset(assetMap.global.brandFlask)} alt="" />
          <h1>{error ? "页面没有加载完整" : "正在准备测试"}</h1>
          <p>{error ? "请刷新页面重试；如果仍然无法打开，稍后再访问。" : "题目和评测引擎正在载入。"}</p>
          {error && <button className="primary-button" type="button" onClick={() => window.location.reload()}>刷新页面</button>}
        </section>
      </main>
      <FooterSignature />
    </div>
  );
}

function SmokeBackdrop({ view, score }) {
  const smoke = view === "result" ? resultSmokePath(score ?? 50) : view === "question" ? assetMap.smoke.questionMobile : view === "work" ? assetMap.smoke.workContext : view === "theory" ? assetMap.smoke.theoryEdge : assetMap.smoke.homeAmbient;
  const secondary = view === "question" ? assetMap.smoke.questionMobile : smoke;
  const density = view === "question" ? assetMap.smoke.questionDensity : view === "result" ? assetMap.smoke.shareCard : smoke;
  return (
    <div className={`smoke-backdrop smoke-${view}`} aria-hidden="true">
      <img className="smoke-layer smoke-primary" src={publicAsset(smoke)} alt="" />
      <img className="smoke-layer smoke-secondary" src={publicAsset(secondary)} alt="" />
      <img className="smoke-layer smoke-density-layer" src={publicAsset(density)} alt="" />
    </div>
  );
}

function BrandHeader({ view, menuOpen, onToggleMenu, onHome, onLearn, onStart }) {
  return (
    <header className="brand-header">
      <button className="brand-lockup" onClick={onHome} type="button" aria-label="返回首页">
        <img src={publicAsset(assetMap.global.brandFlask)} alt="" />
        <span>
          <strong>抗蒸性测试</strong>
          <small>测测你的含活人量</small>
        </span>
      </button>
      <nav className={menuOpen ? "is-open" : ""}>
        <button type="button" onClick={onLearn}>什么是抗蒸性？</button>
        <button type="button" onClick={onStart}>开始测试</button>
      </nav>
      <button className="mobile-menu-button" type="button" aria-label="打开导航" aria-expanded={menuOpen} onClick={onToggleMenu}>
        <span />
        <span />
        <span />
      </button>
      {view === "result" && (
        <button className="header-share" type="button" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}>
          分享结果
        </button>
      )}
    </header>
  );
}

function StepIndicator({ active }) {
  const steps = ["开始", "工作场景", "动态测试", "结果"];
  return (
    <ol className="step-indicator" aria-label="测试流程">
      {steps.map((step, index) => (
        <li key={step} className={index < active ? "done" : index === active ? "current" : ""}>
          <span>{index < active ? "✓" : index + 1}</span>
          <small>{step}</small>
        </li>
      ))}
    </ol>
  );
}

function HomePage({ onStart, onLearn }) {
  return (
    <section className="home-page page-frame">
      <div className="hero-copy">
        <h1>测测你的抗蒸性</h1>
        <div className="title-rule" aria-hidden="true" />
        <p>看看你的判断、经验、审美和取舍，有多难被低损耗蒸馏成一套工作流、一个插件，或一个同事 Skill。</p>
        <div className="hero-actions">
          <button className="primary-button" type="button" onClick={onStart}>开始测试 <span>→</span></button>
          <button className="text-button" type="button" onClick={onLearn}>什么是抗蒸性？ <span>›</span></button>
        </div>
      </div>

      <figure className="distillation-art" aria-label="人的想法经过蒸馏形成工作流、插件、Skill 和提示词">
        <picture>
          <source media="(max-width: 820px)" srcSet={publicAsset(assetMap.global.homeDistillationMobile)} />
          <img src={publicAsset(assetMap.global.homeDistillationDesktop)} alt="人的想法经过蒸馏过程转化为工作流、插件、Skill 和提示词" />
        </picture>
      </figure>

      <div className="meaning-callout">
        <span className="seal-icon"><img src={publicAsset(assetMap.global.sparkleSeal)} alt="" /></span>
        <div>
          <h2>含活人量，越高越难蒸馏</h2>
          <p>我们关心的不是你会不会被替代，而是你身上那些不可低损耗复制的人味。</p>
        </div>
        <span className="human-stamp" aria-label="人味难蒸"><span>人味</span><span>难蒸</span></span>
      </div>
    </section>
  );
}

function TheoryPage({ onBack, onStart }) {
  return (
    <section className="theory-page page-frame compact-frame">
      <div className="theory-heading">
        <h1>什么是抗蒸性</h1>
        <p>人在 AI 时代的低损耗不可蒸馏能力</p>
        <div className="title-rule" aria-hidden="true" />
      </div>

      <figure className="theory-flow-art" aria-label="复杂的人类判断经过蒸馏后形成工作流、插件、Skill 与提示词">
        <img src={publicAsset(assetMap.global.homeDistillationDesktop)} alt="人的想法经过蒸馏过程转化为工作流、插件、Skill 和提示词" />
      </figure>

      <div className="theory-grid top">
        <article className="theory-card">
          <h2>1. 概念定义：从人到 Skill 的信息损耗</h2>
          <p>所谓“蒸馏”，是把复杂的人类工作过程提炼为可复用、可自动化的规则、流程、提示词或插件，使其能被机器或他人以更低成本复制。</p>
          <p>抗蒸性，是指在这个过程中仍然保留在关键判断、审美取舍、责任承担和现场理解上的人味与独特性。</p>
        </article>
        <article className="theory-card model-card">
          <h2>2. 抗蒸性三层模型</h2>
          <div className="layer-model">
            <div><strong>责任层</strong><span>为结果负责</span></div>
            <div><strong>判断层</strong><span>做出更优取舍</span></div>
            <div><strong>行为层</strong><span>执行与产出</span></div>
          </div>
          <p>越靠上的层越难被低损耗复制。AI 能生成内容，但不天然承担后果；流程能提高稳定性，但不自动理解边界。</p>
        </article>
      </div>

      <section className="dimension-grid">
        <h2>3. 六个观察维度</h2>
        <div>
          {Object.entries(DIMENSION_DETAILS).map(([key, item]) => (
            <article key={key}>
              <span className="dimension-symbol" aria-hidden="true">
                <svg viewBox="0 0 120 120">
                  <use href={`${publicAsset(assetMap.dimensions.icons)}#${DIMENSION_ICON_SYMBOLS[key]}`} />
                </svg>
              </span>
              <strong>{item.name}</strong>
              <p>{item.subtitle}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="theory-grid bottom">
        <article className="theory-card">
          <h2>4. 为什么它重要</h2>
          <ul>
            <li>AI 能复制输出形式，但未必理解情境、责任和后果。</li>
            <li>决定质量差异的，往往是无法被规则穷尽的判断与品味。</li>
            <li>抗蒸性越高，越能把 AI 变成放大器，而不是替身。</li>
          </ul>
        </article>
        <article className="theory-card">
          <h2>5. 如何培养抗蒸性</h2>
          <ul>
            <li>积累可追溯经验：把决策结果和失败边界记录下来。</li>
            <li>练习边界判断：说明一个方法什么时候不适用。</li>
            <li>把隐性判断表达出来：让直觉变成可讨论、可校准的资产。</li>
          </ul>
        </article>
      </div>

      <div className="theory-note">
        <span>i</span>
        <p>说明：本测试使用自拟的蒸馏损耗模型，用于自我理解与讨论，不用于招聘、医疗或人格定论。</p>
      </div>

      <div className="theory-actions">
        <button className="secondary-button" type="button" onClick={onBack}>返回首页</button>
        <button className="primary-button" type="button" onClick={onStart}>开始测试</button>
      </div>
    </section>
  );
}

function WorkContextPage({ onSubmit, onSkip }) {
  const [form, setForm] = useState({});
  const [needsAnswer, setNeedsAnswer] = useState(false);

  const submit = () => {
    if (!Object.values(form).some(Boolean)) {
      setNeedsAnswer(true);
      return;
    }
    onSubmit(Object.fromEntries(Object.entries(form).map(([name, option]) => [name, option.value])));
  };

  return (
    <section className="work-page page-frame compact-frame">
      <div className="work-heading">
        <h1>要不要先校准你的工作场景？</h1>
        <div className="title-rule" aria-hidden="true" />
        <p>这部分不会直接改变你的个人含活人量分数，只帮助结果页区分：是你本人难蒸，还是这份工作本身更容易或更不容易被蒸。</p>
      </div>

      <form className={`work-card ${needsAnswer ? "needs-answer" : ""}`} aria-invalid={needsAnswer}>
        {ROLE_FIELDS.map((field) => (
          <div key={field.name} className={`work-field work-field-${field.options.length}`} role="group" aria-labelledby={`work-${field.name}`}>
            <div className="work-field-title" id={`work-${field.name}`}>
              <WorkIcon type={field.icon} />
              <span>{field.title}</span>
            </div>
            <div className="radio-grid" role="radiogroup" aria-label={field.title}>
              {field.options.map(([value, label], index) => (
                <button
                  className="radio-option"
                  key={`${field.name}-${value}-${index}`}
                  type="button"
                  role="radio"
                  aria-checked={form[field.name]?.id === `${field.name}-${index}`}
                  data-checked={form[field.name]?.id === `${field.name}-${index}` ? "true" : "false"}
                  onClick={() => {
                    setNeedsAnswer(false);
                    setForm((current) => ({ ...current, [field.name]: { id: `${field.name}-${index}`, value } }));
                  }}
                >
                  <span className="radio-dot" aria-hidden="true" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </form>

      {needsAnswer && <p className="form-error">至少选择一项，或直接跳过校准。</p>}
      <div className="work-submit-panel">
        <div className="work-actions">
          <button className="primary-button" type="button" onClick={submit}>提交，开始测试</button>
          <button className="secondary-button" type="button" onClick={onSkip}>跳过，直接测试</button>
        </div>
        <div className="skip-note">
          <span aria-hidden="true">ⓘ</span>
          <p>跳过后仍可得到个人含活人量；结果页只是不显示岗位蒸馏度判断。</p>
        </div>
      </div>
    </section>
  );
}

function WorkIcon({ type }) {
  const path = {
    briefcase: "M5 8h14v10H5z M9 8V6h6v2 M5 12h14",
    people: "M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M16 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M3 20c.8-4 8.2-4 10 0 M13 19c.8-3 6-3 8 0",
    sliders: "M4 7h16 M4 12h16 M4 17h16 M8 5v4 M15 10v4 M11 15v4",
  }[type];
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

function QuestionPage({ currentItem, engine, history, progress, onAnswer, onPrevious, onRestart }) {
  const [selectedKey, setSelectedKey] = useState(null);

  useEffect(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setSelectedKey(null);
  }, [currentItem?.id]);

  if (!currentItem) return null;
  const options = engine.orderedOptions(currentItem);
  const totalDots = Math.min(engine.flow.maximumQuestions || 24, 24);
  const chooseOption = (optionKey) => {
    if (selectedKey) return;
    setSelectedKey(optionKey);
    window.setTimeout(() => onAnswer(optionKey), 240);
  };

  return (
    <section className="question-page">
      <aside className="quiz-side">
        <div className="quiz-side-lockup">
          <img src={publicAsset(assetMap.global.brandFlask)} alt="" />
          <span><strong>抗蒸性测试</strong><small>测测你的含活人量</small></span>
        </div>
        <nav>
          <span className="active">正在测试</span>
          <span>测试说明</span>
          <span>什么是抗蒸性</span>
        </nav>
        <button type="button" onClick={onRestart}>退出后可重新开始</button>
      </aside>

      <div className="question-panel">
        <div className="question-status">
          <div>
            <strong>{progress.label}</strong>
            <span>阶段说明：{progress.intro}</span>
          </div>
          <div className="progress-cluster">
            <span>已完成 <b>{progress.answered}</b> 题</span>
            <div className="dot-progress" aria-label={`已完成 ${progress.answered} 题`}>
              {Array.from({ length: totalDots }).map((_, index) => (
                <i key={index} className={index < progress.answered ? "done" : index === progress.answered ? "current" : ""} />
              ))}
            </div>
          </div>
        </div>

        <article className="question-card">
          <p className="dimension-text">{currentItem.dimensionText || "动态追问"}</p>
          <h1>{currentItem.question}</h1>
          <div className="option-list" key={currentItem.id}>
            {options.map((option, index) => (
              <button
                className={`option-card ${selectedKey === option.key ? "is-selected" : selectedKey ? "is-dimmed" : "is-ready"}`}
                key={option.key}
                type="button"
                aria-pressed={selectedKey === option.key}
                onClick={() => chooseOption(option.key)}
              >
                <b aria-hidden="true">{index + 1}</b>
                <span>{option.text}</span>
                <i aria-hidden="true">✓</i>
              </button>
            ))}
          </div>

          <div className="question-actions">
            <button className="secondary-button" type="button" onClick={onPrevious} disabled={!history.length}>← 上一题</button>
            <p>没有绝对正确的答案，选最接近你的那一个。</p>
          </div>
        </article>

        <div className="smoke-density">
          <span>答题进度</span>
          <div><i style={{ width: `${progress.percent}%` }} /></div>
          <strong>{progress.answered} 题</strong>
        </div>
      </div>
    </section>
  );
}

function ResultPage({ result, onRestart, onOpenDetail }) {
  const [copyState, setCopyState] = useState("idle");
  const bandBadge = assetMap.resultBands?.[result.band.name];
  const labelBadge = assetMap.labels?.[result.labelKey] || assetMap.labels?.latent_human_variable;
  const roleText = result.role || "";
  const showRole = roleText && !roleText.includes("跳过") && !roleText.includes("没有填写");
  const shareText = buildShareLine(result);

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopyState("done");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout(() => setCopyState("idle"), 1600);
  };

  return (
    <section className={`result-page result-${resultTone(result.score)}`}>
      <div className="result-hero">
        <img className="score-smoke" src={publicAsset(resultSmokePath(result.score))} alt="" aria-hidden="true" />
        <div className="score-block">
          <span>测试完成</span>
          <h1>你的含活人量</h1>
          <div className="score-number"><strong>{result.score}</strong><em>%</em></div>
          <p>{scoreHelpText(result.score)}</p>
        </div>
        <div className="band-block">
          <span>你的段位是</span>
          <div>
            {bandBadge && <img src={publicAsset(bandBadge)} alt={`${result.band.name}徽章`} />}
            <h2>{result.band.name}</h2>
          </div>
          <p>{bandRoastText(result)}</p>
        </div>
        <div className="result-actions">
          <button className="secondary-button" type="button" onClick={onRestart}>再测一次</button>
          <button className="primary-button dark" type="button" onClick={copyShare}>{copyState === "done" ? "已复制" : copyState === "failed" ? "复制失败" : "分享结果"}</button>
        </div>
      </div>

      <div className={`result-grid ${showRole ? "" : "no-role"}`}>
        <article className="result-card label-card" onClick={() => onOpenDetail(buildLabelDetail(result))}>
          <h2>你的结构标签</h2>
          {labelBadge && <img src={publicAsset(labelBadge)} alt={`${result.labelDetails.name}徽章`} />}
          <h3>{result.labelDetails.name}</h3>
          <p>{result.labelDetails.plainMeaning}</p>
          <button type="button">查看标签详情 ›</button>
        </article>

        <article className="result-card share-card">
          <h2>一句话分享</h2>
          <blockquote>{result.labelDetails.shareLine || result.band.line}</blockquote>
          <p>#我的含活人量{result.score}% #{result.band.name}</p>
          <button className="secondary-button" type="button" onClick={copyShare}>复制分享文案</button>
        </article>

        {showRole && (
          <article className="result-card role-card">
            <h2>岗位蒸馏度</h2>
            <strong>{roleText.includes("偏低") ? "中等偏低" : roleText.includes("偏高") ? "高" : "中等"}</strong>
            <p>{roleText}</p>
          </article>
        )}

        <article className="result-card dimension-card">
          <h2>六大维度表现</h2>
          <div className="dimension-bars">
            {result.dimensions.map((dimension) => {
              const detail = DIMENSION_DETAILS[dimension.key];
              return (
                <button key={dimension.key} type="button" onClick={() => onOpenDetail(buildDimensionDetail(dimension, result))}>
                  <span className="dimension-icon" aria-hidden="true">
                    <svg viewBox="0 0 120 120">
                      <use href={`${publicAsset(assetMap.dimensions.icons)}#${DIMENSION_ICON_SYMBOLS[dimension.key]}`} />
                    </svg>
                  </span>
                  <strong>{dimension.name}</strong>
                  <i><b style={{ width: `${dimension.value}%`, background: detail.color }} /></i>
                  <em>{dimension.value}%</em>
                </button>
              );
            })}
          </div>
        </article>

        <article className="result-card evidence-card">
          <h2>这次结果怎么读？</h2>
          <ul>
            <li>含活人量来自你在具体情境里的取舍，而不是自我评价。</li>
            <li>结构标签表示这次最突出的判断风格，不是人格定型。</li>
            <li>六个维度展示的是不同判断场景里的相对表现。</li>
            <li>点击标签或维度，可以继续看含义、误读点和提升建议。</li>
          </ul>
        </article>
      </div>

      <SharePanel result={result} onCopy={copyShare} state={copyState} />
    </section>
  );
}

function SharePanel({ result, onCopy, state }) {
  return (
    <aside className="share-panel">
      <div>
        <strong>小贴士</strong>
        <p>含活人量不是好坏评判，而是特征识别。高含活人量意味着更难被低损耗复制；低含活人量意味着你更适合标准化、规模化。</p>
      </div>
      <button className="text-button" type="button" onClick={onCopy}>{state === "done" ? "已复制分享文案" : "复制结果文案"} <span>›</span></button>
    </aside>
  );
}

function buildLabelDetail(result) {
  return {
    type: "结构标签",
    title: result.labelDetails.name,
    subtitle: result.labelDetails.plainMeaning,
    asset: assetMap.labels?.[result.labelKey] || assetMap.labels?.latent_human_variable,
    sections: [
      ["这是什么意思", result.labelDetails.plainMeaning],
      ["为什么你可能是这个标签", `系统在 ${result.signals.slice(0, 3).map((signal) => signal.name).join("、")} 上看到了较强信号。`],
      ["容易被误解成什么", "标签不是人格定型，只是这次答题中最突出的判断结构。你可能同时具备多个候选结构。"],
      ["怎么提升含活人量", result.labelDetails.shareLine || "把隐性判断说清楚，让经验能够被追溯、被校准。"],
      ["本次表现证据", `这次更明显的信号集中在：${result.signals.slice(0, 3).map((signal) => `${signal.name} ${signal.value}%`).join("、")}。`],
    ],
  };
}

function buildDimensionDetail(dimension, result) {
  const detail = DIMENSION_DETAILS[dimension.key];
  return {
    type: "维度详情",
    title: detail.name,
    subtitle: `${detail.subtitle}｜本次 ${dimension.value}%`,
    asset: assetMap.labels?.[detail.assetKey] || assetMap.labels?.latent_human_variable,
    sections: [
      ["这是什么意思", detail.meaning],
      ["为什么你可能是这个表现", detail.evidence],
      ["容易被误解成什么", detail.misunderstanding],
      ["怎么提升含活人量", detail.growth],
      ["本次表现证据", `在你的结果中，${detail.name} 为 ${dimension.value}%。整体段位为 ${result.band.name}，结构标签为 ${result.labelDetails.name}。`],
    ],
  };
}

function ResultDetailDrawer({ detail, onClose }) {
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [openSection, setOpenSection] = useState(0);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 820px)");
    const update = () => setIsSmallScreen(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setOpenSection(0);
  }, [detail.title]);

  return (
    <div className="detail-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <button className="detail-close" type="button" onClick={onClose} aria-label="关闭">×</button>
        <div className="detail-tabs">
          <span className={detail.type === "结构标签" ? "active" : ""}>结构标签</span>
          <span className={detail.type === "维度详情" ? "active" : ""}>维度详情</span>
        </div>
        <header>
          <div>
            <h2 id="detail-title">{detail.title}</h2>
            <p>{detail.subtitle}</p>
          </div>
          {detail.asset && <img src={publicAsset(detail.asset)} alt="" />}
        </header>
        <div className="detail-sections">
          {detail.sections.map(([title, text], index) => (
            isSmallScreen ? (
              <details
                key={title}
                open={openSection === index}
                onToggle={(event) => event.currentTarget.open && setOpenSection(index)}
              >
                <summary>{title}</summary>
                <p>{text}</p>
              </details>
            ) : (
              <section key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </section>
            )
          ))}
        </div>
        <button className="primary-button soft" type="button" onClick={onClose}>看完了</button>
      </aside>
    </div>
  );
}

function FooterSignature() {
  return <footer className="signature">Designed by Jacob HONG</footer>;
}

export default App;
