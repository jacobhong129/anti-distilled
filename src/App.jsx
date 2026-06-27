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

const QUESTION_GUIDES = {
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

const DIMENSION_DETAILS = {
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

function DimensionVisual({ dimensionKey }) {
  const line = {
    fill: "none",
    stroke: "#1f6f5a",
    strokeWidth: 7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const soft = {
    fill: "none",
    stroke: "#a88f6a",
    strokeWidth: 5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const fill = {
    fill: "#eef5ef",
    stroke: "#1f6f5a",
    strokeWidth: 7,
  };

  const icons = {
    CXT: (
      <>
        <circle {...fill} cx="60" cy="60" r="38" />
        <path {...line} d="M60 25v12M60 83v12M25 60h12M83 60h12" />
        <path {...line} d="M43 43l17 17 21-30" />
        <path {...soft} d="M37 80c11 8 34 10 48-5" />
      </>
    ),
    BND: (
      <>
        <path {...fill} d="M29 96 56 23c1-4 7-4 9 0l26 73" />
        <path {...line} d="M42 67h36M50 47h20M34 85h52" />
        <path {...soft} d="M27 101h66" />
      </>
    ),
    GEN: (
      <>
        <path {...fill} d="M31 43 60 27l29 16v34L60 93 31 77Z" />
        <path {...line} d="M31 43 60 60l29-17M60 60v33" />
        <path {...soft} d="M42 36v-9M77 36v-9M24 61h-9M105 61h-9" />
      </>
    ),
    TST: (
      <>
        <path {...line} d="M17 60s16-28 43-28 43 28 43 28-16 28-43 28-43-28-43-28Z" />
        <circle {...fill} cx="60" cy="60" r="16" />
        <path {...soft} d="M36 28l-8-10M84 28l8-10M36 92l-8 10M84 92l8 10" />
      </>
    ),
    STN: (
      <>
        <circle {...fill} cx="60" cy="60" r="36" />
        <path {...line} d="M60 38v24l18 10" />
        <path {...soft} d="M84 29l8-8M92 21h-14M92 21v14" />
        <path {...soft} d="M34 88c9 8 25 12 42 3" />
      </>
    ),
    GRD: (
      <>
        <circle {...fill} cx="60" cy="60" r="34" />
        <circle {...soft} cx="60" cy="60" r="22" />
        <circle {...soft} cx="60" cy="60" r="10" />
        <path {...line} d="M60 13v13M60 94v13M13 60h13M94 60h13" />
        <path {...soft} d="M26 26l9 9M86 86l9 9M94 26l-9 9M35 86l-9 9" />
      </>
    ),
  };

  return (
    <svg className="dimension-visual" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      {icons[dimensionKey]}
    </svg>
  );
}

function BrandFlaskMark({ className = "brand-mark" }) {
  return (
    <svg className={className} viewBox="0 0 220 220" aria-hidden="true" focusable="false">
      <rect width="220" height="220" rx="28" fill="#fbfaf6" />
      <path
        d="M93 32h34M101 32v54l-43 68c-12 19 2 44 24 44h56c22 0 36-25 24-44l-43-68V32"
        fill="none"
        stroke="#18382f"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M80 143c23 14 57 14 80 0"
        fill="none"
        stroke="#a79263"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="110" cy="154" r="22" fill="#1f6f5a" opacity=".25" />
      <path
        d="M110 134l7 16 18 3-14 12 4 18-15-10-15 10 4-18-14-12 18-3Z"
        fill="none"
        stroke="#18382f"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AssetBadge({ src, alt, label, className = "", variant = "label" }) {
  const [failed, setFailed] = useState(false);
  const fallbackLabel = label || alt || "徽章";
  const fallbackText = fallbackLabel.slice(0, 2);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return <img className={className} src={publicAsset(src)} alt={alt} onError={() => setFailed(true)} />;
  }

  return (
    <span className={`asset-badge-fallback asset-badge-${variant} ${className}`} role={alt ? "img" : undefined} aria-label={alt || fallbackLabel}>
      <span>{fallbackText}</span>
    </span>
  );
}

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
  if (score >= 90) return "你的判断很难被完整复制，关键差异藏在现场感、分寸和责任感里。";
  if (score >= 80) return "你的很多方法可以被学习，但真正影响结果的判断仍需要本人到场。";
  if (score >= 70) return "流程能复制一部分，例外、边界和取舍会保留明显的人味。";
  if (score >= 52) return "你有一部分适合沉淀成方法，也有一部分还需要你亲自把关。";
  if (score >= 35) return "你很适合标准化协作；这个结果提醒你看清哪些判断还没有长出自己的来源。";
  return "你很适合把事情做稳做清楚；下一步是把自己的判断来源练得更明显。";
}

function bandRoastText(result) {
  const label = result.labelDetails?.name || "判断标签";
  if (result.score >= 90) return `彩烟很足：${label}这块，别人学得到话术，未必学得到你为什么这么判断。`;
  if (result.score >= 80) return `你不是不能总结，而是总结完还会漏掉一截关键人味：那部分通常来自${label}。`;
  if (result.score >= 70) return "你不是反流程的人，但流程遇到复杂现场时，还得问一句“这次到底哪里不一样”。";
  if (result.score >= 62) return "招牌正在成形，接下来要看清：哪些是稳定判断，哪些只是这次答得顺。";
  if (result.score >= 52) return "有些部分能沉淀成方法，但别把自己整理得太干，关键判断还要留住。";
  if (result.score >= 48) return "你很适合协作和对齐；这个结果更像提醒：别只交付答案，也要看见判断来源。";
  if (result.score >= 35) return "你很适合稳定交付。真正的问题不是要不要流程，而是流程之外还保留什么判断。";
  return "你很可靠，也很容易被整理成方法。这个结果可以用来反问：哪些经验还没长成自己的判断。";
}

function buildShareLine(result) {
  return `我做了抗蒸性测试：含活人量 ${result.score}%｜${result.band.name}｜判断标签：${result.labelDetails.name}。${result.labelDetails.shareLine || result.labelDetails.plainMeaning}`;
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

  const openLabelDetail = () => {
    if (!flow.result) return;
    const firstDimension = flow.result?.dimensions?.[0]?.key || null;
    setDetail({ kind: "label", result: flow.result, dimensionKey: firstDimension });
  };

  const openDimensionDetail = (dimension) => {
    if (!flow.result) return;
    setDetail({ kind: "dimension", result: flow.result, dimensionKey: dimension.key });
  };

  const closeDetail = () => setDetail(null);

  const switchDetailMode = (kind, dimensionKey) => {
    if (!detail || !detail.result) return;
    setDetail((current) => current ? {
      ...current,
      kind,
      dimensionKey: kind === "dimension"
        ? dimensionKey || current.dimensionKey || current.result?.dimensions?.[0]?.key
        : current.dimensionKey || current.result?.dimensions?.[0]?.key,
    } : null);
  };

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
          onOpenLabel={openLabelDetail}
          onOpenDimension={openDimensionDetail}
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
      {detail && <ResultDetailDrawer detail={detail} onClose={closeDetail} onSwitch={switchDetailMode} />}
    </div>
  );
}

function AppStatus({ error }) {
  return (
    <div className="app-shell view-home">
      <SmokeBackdrop view="home" />
      <main>
        <section className="app-status page-frame">
          <BrandFlaskMark className="brand-mark status-brand-mark" />
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
        <BrandFlaskMark />
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
        <h1><span>测测你的</span><span>抗蒸性</span></h1>
        <div className="title-rule" aria-hidden="true" />
        <p>看看你的判断、经验、审美和取舍，有多难被蒸馏成一套工作流、一个插件，或一个同事 Skill。</p>
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
          <p>我们关心的不是你会不会被替代，而是你身上那些很难完整复制的人味。</p>
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
        <p>人在 AI 时代，哪些部分很难被完整复制</p>
        <div className="title-rule" aria-hidden="true" />
      </div>

      <figure className="theory-flow-art" aria-label="复杂的人类判断经过蒸馏后形成工作流、插件、Skill 与提示词">
        <img src={publicAsset(assetMap.global.homeDistillationDesktop)} alt="人的想法经过蒸馏过程转化为工作流、插件、Skill 和提示词" />
      </figure>

      <div className="theory-grid top">
        <article className="theory-card">
          <h2>1. 概念定义：从人到 Skill，会丢掉什么</h2>
          <p>所谓“蒸馏”，是把复杂的人类工作过程提炼为可复用、可自动化的规则、流程、提示词或插件，使其能被机器或他人以更低成本复制。</p>
          <p>抗蒸性，是指在这个过程中仍然留在你身上的关键判断、审美取舍、责任承担和现场理解。</p>
        </article>
        <article className="theory-card model-card">
          <h2>2. 抗蒸性三层模型</h2>
          <div className="layer-model">
            <div><strong>责任层</strong><span>为结果负责</span></div>
            <div><strong>判断层</strong><span>做出更优取舍</span></div>
            <div><strong>行为层</strong><span>执行与产出</span></div>
          </div>
          <p>越靠上的层越难被完整复制。AI 能生成内容，但不天然承担后果；流程能提高稳定性，但不会自动理解边界。</p>
        </article>
      </div>

      <section className="dimension-grid">
        <h2>3. 六个观察维度</h2>
        <div>
          {Object.entries(DIMENSION_DETAILS).map(([key, item]) => (
            <article key={key}>
              <span className="dimension-symbol" aria-hidden="true">
                <DimensionVisual dimensionKey={key} />
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
            <li>抗蒸性越高，越能把 AI 变成放大器，而不是自己的替身。</li>
          </ul>
        </article>
        <article className="theory-card">
          <h2>5. 如何理解自己的抗蒸性</h2>
          <ul>
            <li>看经验来源：你的判断是来自真实经历，还是来自听起来合理的模板。</li>
            <li>看边界意识：你是否知道一个方法什么时候不适用。</li>
            <li>看取舍能力：你是否能说明为什么保留这个、放弃那个。</li>
          </ul>
        </article>
      </div>

      <div className="theory-note">
        <span>i</span>
        <p>说明：本测试是一个自我理解工具，用来讨论你在 AI 时代的判断方式，不用于招聘、医疗或人格定论。</p>
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
        <h1>要不要先补充你的工作场景？</h1>
        <div className="title-rule" aria-hidden="true" />
        <p>这部分不会直接改变你的含活人量，只帮助结果页区分：是你本人很难复制，还是这份工作本身更容易被流程或 AI 接手。</p>
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

      {needsAnswer && <p className="form-error">至少选择一项，或直接跳过这一步。</p>}
      <div className="work-submit-panel">
        <div className="work-actions">
          <button className="primary-button" type="button" onClick={submit}>提交，开始测试</button>
          <button className="secondary-button" type="button" onClick={onSkip}>跳过，直接测试</button>
        </div>
        <div className="skip-note">
          <span aria-hidden="true">ⓘ</span>
          <p>跳过后仍可得到含活人量；结果页只是不显示岗位影响分析。</p>
        </div>
      </div>
    </section>
  );
}

function WorkIcon({ type }) {
  const icons = {
    briefcase: (
      <>
        <rect x="5" y="8" width="14" height="10" rx="2" />
        <path d="M9 8V6.8A1.8 1.8 0 0 1 10.8 5h2.4A1.8 1.8 0 0 1 15 6.8V8" />
        <path d="M5 12h14" />
        <path d="M11 12v1h2v-1" />
      </>
    ),
    people: (
      <>
        <circle cx="8" cy="8" r="2.6" />
        <circle cx="16" cy="9" r="2.2" />
        <path d="M3.5 19c.8-3.7 8.2-3.7 9 0" />
        <path d="M12.5 18.5c.7-2.8 5.6-2.8 8 0" />
      </>
    ),
    sliders: (
      <>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
        <circle cx="8" cy="7" r="1.7" />
        <circle cx="15" cy="12" r="1.7" />
        <circle cx="11" cy="17" r="1.7" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {icons[type]}
    </svg>
  );
}

function QuestionPage({ currentItem, engine, history, progress, onAnswer, onPrevious, onRestart }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const [guide, setGuide] = useState(null);

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
          <BrandFlaskMark />
          <span><strong>抗蒸性测试</strong><small>测测你的含活人量</small></span>
        </div>
        <nav>
          <button className="active" type="button" aria-current="page">正在测试</button>
          <button type="button" onClick={() => setGuide("instructions")}>测试说明</button>
          <button type="button" onClick={() => setGuide("theory")}>什么是抗蒸性</button>
        </nav>
        <button type="button" onClick={onRestart}>退出后可重新开始</button>
      </aside>

      <div className="question-panel">
        <div className="question-status">
          <div>
            <strong>{progress.label}</strong>
            <span>{progress.intro}</span>
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
      {guide && <QuestionGuideDrawer guide={QUESTION_GUIDES[guide]} onClose={() => setGuide(null)} />}
    </section>
  );
}

function QuestionGuideDrawer({ guide, onClose }) {
  return (
    <div className="question-guide-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="question-guide-drawer" role="dialog" aria-modal="true" aria-labelledby="question-guide-title">
        <button className="detail-close" type="button" onClick={onClose} aria-label="关闭">×</button>
        <header>
          <h2 id="question-guide-title">{guide.title}</h2>
          <p>{guide.subtitle}</p>
        </header>
        <div className="detail-sections">
          {guide.sections.map(([title, text]) => (
            <section key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </section>
          ))}
        </div>
        <button className="primary-button soft" type="button" onClick={onClose}>继续答题</button>
      </aside>
    </div>
  );
}

function ResultPage({ result, onRestart, onOpenLabel, onOpenDimension }) {
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
            <AssetBadge src={bandBadge} alt={`${result.band.name}徽章`} label={result.band.name} variant="band" />
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
        <article className="result-card label-card" onClick={onOpenLabel}>
          <h2>你的判断标签</h2>
          <AssetBadge src={labelBadge} alt={`${result.labelDetails.name}徽章`} label={result.labelDetails.name} variant="label" />
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
            <h2>岗位影响</h2>
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
                <button key={dimension.key} type="button" onClick={() => onOpenDimension(dimension)}>
                  <span className="dimension-icon" aria-hidden="true">
                    <DimensionVisual dimensionKey={dimension.key} />
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
          <h2>这次结果提醒你想什么？</h2>
          <ul>
            <li>含活人量不是好坏评判，而是在看你的判断里有多少情境、边界、经验和取舍。</li>
            <li>判断标签不是人格定型，只是这次答题里最突出的判断线索。</li>
            <li>六个维度不是训练清单，而是六个反问角度：我看见了什么、舍弃了什么、承担了什么。</li>
            <li>点击标签或维度，可以继续理解这个结果为什么成立，以及哪些地方可能被看偏。</li>
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
        <p>含活人量更像一面镜子：它不告诉你该做什么，而是提醒你在 AI 越来越会执行之后，哪些判断还要留在自己手里。</p>
      </div>
      <button className="text-button" type="button" onClick={onCopy}>{state === "done" ? "已复制分享文案" : "复制结果文案"} <span>›</span></button>
    </aside>
  );
}

function buildLabelDetail(result) {
  return {
    type: "判断标签",
    title: result.labelDetails.name,
    subtitle: result.labelDetails.plainMeaning,
    asset: assetMap.labels?.[result.labelKey] || assetMap.labels?.latent_human_variable,
    sections: [
      ["这是什么意思", result.labelDetails.plainMeaning],
      ["为什么你可能是这个标签", `这次答题里，${result.signals.slice(0, 3).map((signal) => signal.name).join("、")} 的信号比较明显。`],
      ["容易被误解成什么", "标签不是人格定型，只是这次答题里最突出的判断线索。你可能同时具备多个候选标签。"],
      ["它提醒你思考什么", result.labelDetails.shareLine || "你可以反问自己：这个判断来自经验、审美、责任，还是只是对流程的熟练执行。"],
      ["本次表现证据", `这次比较明显的信号集中在：${result.signals.slice(0, 3).map((signal) => `${signal.name} ${signal.value}%`).join("、")}。`],
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
      ["它提醒你思考什么", detail.growth],
      ["本次表现证据", `在你的结果中，${detail.name} 为 ${dimension.value}%。整体段位为 ${result.band.name}，判断标签为 ${result.labelDetails.name}。`],
    ],
  };
}

function ResultDetailDrawer({ detail, onClose, onSwitch }) {
  const [activeTab, setActiveTab] = useState(detail.kind === "dimension" ? "dimension" : "label");
  const [selectedDimensionKey, setSelectedDimensionKey] = useState(detail.dimensionKey);
  const labelDetail = useMemo(() => buildLabelDetail(detail.result), [detail.result]);
  const dimensions = detail.result?.dimensions || [];
  const activeDimension = dimensions.find((dimension) => dimension.key === selectedDimensionKey) || dimensions[0];
  const dimensionDetail = activeDimension ? buildDimensionDetail(activeDimension, detail.result) : null;

  useEffect(() => {
    setActiveTab(detail.kind === "dimension" ? "dimension" : "label");
    setSelectedDimensionKey(detail.dimensionKey || dimensions[0]?.key);
  }, [detail.kind, detail.dimensionKey, dimensions]);

  const detailContent = activeTab === "dimension" && dimensionDetail ? dimensionDetail : labelDetail;

  const showDimensionTab = Boolean(detail.result?.dimensions?.length);

  const switchTab = (nextTab) => {
    if (nextTab === activeTab) return;
    const nextDimensionKey = nextTab === "dimension"
      ? (selectedDimensionKey || detail.dimensionKey || dimensions[0]?.key)
      : selectedDimensionKey;
    onSwitch(nextTab === "dimension" ? "dimension" : "label", nextDimensionKey);
    setActiveTab(nextTab);
  };

  const switchDimension = (dimensionKey) => {
    if (!dimensionKey || dimensionKey === selectedDimensionKey) return;
    setSelectedDimensionKey(dimensionKey);
    onSwitch("dimension", dimensionKey);
  };

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
  }, [detailContent.title]);

  return (
    <div className="detail-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <button className="detail-close" type="button" onClick={onClose} aria-label="关闭">×</button>
        <div className="detail-tabs">
          <button type="button" className={`detail-tab ${activeTab === "label" ? "active" : ""}`} onClick={() => switchTab("label")}>判断标签</button>
          {showDimensionTab && (
            <button type="button" className={`detail-tab ${activeTab === "dimension" ? "active" : ""}`} onClick={() => switchTab("dimension")}>维度详情</button>
          )}
        </div>
        <header>
          <div>
            <h2 id="detail-title">{detailContent.title}</h2>
            <p>{detailContent.subtitle}</p>
          </div>
          <AssetBadge src={detailContent.asset} alt="" label={detailContent.title} variant={activeTab === "dimension" ? "band" : "label"} />
        </header>
        {activeTab === "dimension" && (
          <div className="detail-dim-selector">
            {dimensions.map((dimension, index) => (
              <button
                key={dimension.key}
                type="button"
                className={selectedDimensionKey === dimension.key ? "active" : ""}
                onClick={() => switchDimension(dimension.key)}
              >
                <span>{index + 1}</span>
                <strong>{dimension.name}</strong>
                <em>{dimension.value}%</em>
              </button>
            ))}
          </div>
        )}
        <div className="detail-sections">
          {detailContent.sections.map(([title, text], index) => (
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
