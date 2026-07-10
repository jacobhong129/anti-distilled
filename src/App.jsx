import { useEffect, useMemo, useRef, useState } from "react";
import { assetMap, DIMENSION_SYMBOLS, publicAsset, resultSmokePath } from "./app/assets.js";
import { DIMENSION_DETAILS, QUESTION_GUIDES, ROLE_FIELDS, VIEW_STEP } from "./app/product-content.js";
import {
  bandRoastText,
  buildDimensionDetail,
  buildLabelDetail,
  buildShareLine,
  resultTone,
  scoreHelpText,
} from "./app/result-view-model.js";
import { useAssessmentFlow } from "./hooks/use-assessment-flow.js";
import { useDialogA11y } from "./hooks/use-dialog-a11y.js";
import { useGameConfig } from "./hooks/use-game-config.js";

function DimensionVisual({ dimensionKey }) {
  return (
    <svg className="dimension-visual" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <use href={`${publicAsset(assetMap.dimensions.icons)}#${DIMENSION_SYMBOLS[dimensionKey]}`} />
    </svg>
  );
}

function BrandFlaskMark({ className = "brand-mark" }) {
  return <img className={className} src={publicAsset(assetMap.global.brandFlask)} alt="" aria-hidden="true" />;
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

function App() {
  const { config, error, loading, retry } = useGameConfig();

  if (!config) {
    return <AppStatus error={error} loading={loading} onRetry={retry} />;
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

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeMenuOnEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", closeMenuOnEscape);
    return () => document.removeEventListener("keydown", closeMenuOnEscape);
  }, [menuOpen]);

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

  const content = (() => {
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
  })();

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

function AppStatus({ error, loading, onRetry }) {
  return (
    <div className="app-shell view-home">
      <SmokeBackdrop view="home" />
      <main>
        <section className="app-status page-frame" role={error ? "alert" : "status"} aria-live="polite">
          <BrandFlaskMark className="brand-mark status-brand-mark" />
          <h1>{error ? "页面没有加载完整" : "正在准备测试"}</h1>
          <p>{error ? "题目配置暂时没有载入。可以直接重试，不会清除已经保存的答题进度。" : "题目和评测引擎正在载入。"}</p>
          {error && <button className="primary-button" type="button" onClick={onRetry} disabled={loading}>{loading ? "正在重试" : "重新载入"}</button>}
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
      <nav id="primary-navigation" className={menuOpen ? "is-open" : ""} aria-label="主要导航">
        <button type="button" onClick={onLearn}>什么是抗蒸性？</button>
        <button type="button" onClick={onStart}>开始测试</button>
      </nav>
      <button className="mobile-menu-button" type="button" aria-label={menuOpen ? "关闭导航" : "打开导航"} aria-controls="primary-navigation" aria-expanded={menuOpen} onClick={onToggleMenu}>
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
        <li key={step} className={index < active ? "done" : index === active ? "current" : ""} aria-current={index === active ? "step" : undefined}>
          <span aria-hidden="true">{index < active ? "✓" : index + 1}</span>
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
          <img src={publicAsset(assetMap.global.homeDistillationDesktop)} alt="人的想法经过蒸馏过程转化为工作流、插件、Skill 和提示词" fetchPriority="high" decoding="async" />
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
        <img src={publicAsset(assetMap.global.homeDistillationDesktop)} alt="人的想法经过蒸馏过程转化为工作流、插件、Skill 和提示词" loading="lazy" decoding="async" />
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
  const errorRef = useRef(null);

  useEffect(() => {
    if (needsAnswer) errorRef.current?.focus();
  }, [needsAnswer]);

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

      <form
        id="work-context-form"
        className={`work-card ${needsAnswer ? "needs-answer" : ""}`}
        aria-invalid={needsAnswer}
        aria-describedby={needsAnswer ? "work-form-error" : undefined}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
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

      {needsAnswer && <p ref={errorRef} id="work-form-error" className="form-error" role="alert" tabIndex="-1">至少选择一项，或直接跳过这一步。</p>}
      <div className="work-submit-panel">
        <div className="work-actions">
          <button className="primary-button" type="submit" form="work-context-form">提交，开始测试</button>
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
  const headingRef = useRef(null);
  const answerTimerRef = useRef(null);

  useEffect(() => {
    window.clearTimeout(answerTimerRef.current);
    setSelectedKey(null);
    const focusFrame = window.requestAnimationFrame(() => headingRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.clearTimeout(answerTimerRef.current);
    };
  }, [currentItem?.id]);

  if (!currentItem) return null;
  const options = engine.orderedOptions(currentItem);
  const totalDots = Math.min(engine.flow.maximumQuestions || 24, 24);
  const chooseOption = (optionKey) => {
    if (selectedKey) return;
    setSelectedKey(optionKey);
    answerTimerRef.current = window.setTimeout(() => onAnswer(optionKey), 240);
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
            <div
              className="dot-progress"
              role="progressbar"
              aria-label="答题进度"
              aria-valuemin="0"
              aria-valuemax={totalDots}
              aria-valuenow={progress.answered}
              aria-valuetext={`已完成 ${progress.answered} 题`}
            >
              {Array.from({ length: totalDots }).map((_, index) => (
                <i key={index} className={index < progress.answered ? "done" : index === progress.answered ? "current" : ""} />
              ))}
            </div>
          </div>
        </div>

        <article className="question-card">
          <p className="dimension-text">{currentItem.dimensionText || "动态追问"}</p>
          <h1 ref={headingRef} tabIndex="-1">{currentItem.question}</h1>
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
  const dialogRef = useDialogA11y(onClose);

  return (
    <div className="question-guide-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside ref={dialogRef} className="question-guide-drawer" role="dialog" aria-modal="true" aria-labelledby="question-guide-title" tabIndex="-1">
        <button className="detail-close" type="button" onClick={onClose} aria-label="关闭" data-dialog-initial-focus>×</button>
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
          <button className="primary-button dark" type="button" onClick={copyShare} aria-live="polite">{copyState === "done" ? "已复制" : copyState === "failed" ? "复制失败" : "分享结果"}</button>
        </div>
      </div>

      <div className={`result-grid ${showRole ? "" : "no-role"}`}>
        <article className="result-card label-card">
          <h2>你的判断标签</h2>
          <AssetBadge src={labelBadge} alt={`${result.labelDetails.name}徽章`} label={result.labelDetails.name} variant="label" />
          <h3>{result.labelDetails.name}</h3>
          <p>{result.labelDetails.plainMeaning}</p>
          <button type="button" onClick={onOpenLabel}>查看标签详情 ›</button>
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
      <button className="text-button" type="button" onClick={onCopy} aria-live="polite">{state === "done" ? "已复制分享文案" : "复制结果文案"} <span>›</span></button>
    </aside>
  );
}

function ResultDetailDrawer({ detail, onClose, onSwitch }) {
  const dialogRef = useDialogA11y(onClose);
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
      <aside ref={dialogRef} className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title" tabIndex="-1">
        <button className="detail-close" type="button" onClick={onClose} aria-label="关闭" data-dialog-initial-focus>×</button>
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
