import { useEffect, useMemo, useRef, useState } from "react";
import { assetMap, DIMENSION_SYMBOLS, publicAsset, resultSmokePath } from "./app/assets.js";
import { DIMENSION_DETAILS, QUESTION_GUIDES, ROLE_FIELDS, THEORY_COPY, UI_COPY, VIEW_STEP } from "./app/product-content.js";
import {
  bandRoastText,
  buildDimensionDetail,
  buildLabelDetail,
  buildResultPortrait,
  buildResultReading,
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
          <h1>{error ? "题目没能顺利载入" : "正在把题目摆好"}</h1>
          <p>{error ? "先别急，已经答过的内容还在。点一下重试，我们从刚才的地方继续。" : "很快就好，顺便给每道题找好位置。"}</p>
          {error && <button className="primary-button" type="button" onClick={onRetry} disabled={loading}>{loading ? "再试一次中…" : "再试一次"}</button>}
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
      <button className="brand-lockup" onClick={onHome} type="button" aria-label="回到抗蒸性测试首页">
        <BrandFlaskMark />
        <span>
          <strong>抗蒸性测试</strong>
          <small>测测你的含活人量</small>
        </span>
      </button>
      <nav id="primary-navigation" className={menuOpen ? "is-open" : ""} aria-label="页面导航">
        <button type="button" onClick={onLearn}>{UI_COPY.header.theory}</button>
        <button type="button" onClick={onStart}>{UI_COPY.header.start}</button>
      </nav>
      <button className="mobile-menu-button" type="button" aria-label={menuOpen ? "收起页面导航" : "展开页面导航"} aria-controls="primary-navigation" aria-expanded={menuOpen} onClick={onToggleMenu}>
        <span />
        <span />
        <span />
      </button>
      {view === "result" && (
        <button className="header-share" type="button" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}>
          {UI_COPY.header.share}
        </button>
      )}
    </header>
  );
}

function StepIndicator({ active }) {
  const steps = UI_COPY.steps;
  return (
    <ol className="step-indicator" aria-label="当前测试步骤">
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
        <p>如果把你的工作方式交给 AI、流程或一个同事 Skill，哪些能学走，哪些还得你本人在场？</p>
        <div className="hero-actions">
          <button className="primary-button" type="button" onClick={onStart}>开始测试 <span>→</span></button>
          <button className="text-button" type="button" onClick={onLearn}>{UI_COPY.header.theory} <span>›</span></button>
        </div>
      </div>

      <figure className="distillation-art" aria-label="人的判断和经验被整理成工作流、插件、Skill 与提示词">
        <picture>
          <source media="(max-width: 820px)" srcSet={publicAsset(assetMap.global.homeDistillationMobile)} />
          <img src={publicAsset(assetMap.global.homeDistillationDesktop)} alt="人的判断和经验经过整理，成为工作流、插件、Skill 与提示词" fetchPriority="high" decoding="async" />
        </picture>
      </figure>

      <div className="meaning-callout">
        <span className="seal-icon"><img src={publicAsset(assetMap.global.sparkleSeal)} alt="" /></span>
        <div>
          <h2>方法可以复制，人不只是一套方法</h2>
          <p>含活人量看的，是流程写完以后，还留在你身上的现场、分寸和亲身经验。</p>
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
        <h1>{THEORY_COPY.title}</h1>
        <p>{THEORY_COPY.subtitle}</p>
        <div className="title-rule" aria-hidden="true" />
      </div>

      <figure className="theory-flow-art" aria-label="人的判断和经验被整理成工作流、插件、Skill 与提示词">
        <img src={publicAsset(assetMap.global.homeDistillationDesktop)} alt="人的判断和经验经过整理，成为工作流、插件、Skill 与提示词" loading="lazy" decoding="async" />
      </figure>

      <div className="theory-grid top">
        <article className="theory-card">
          <h2>{THEORY_COPY.distillation.title}</h2>
          {THEORY_COPY.distillation.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </article>
        <article className="theory-card model-card">
          <h2>{THEORY_COPY.layers.title}</h2>
          <div className="layer-model">
            {THEORY_COPY.layers.items.map(([name, text]) => <div key={name}><strong>{name}</strong><span>{text}</span></div>)}
          </div>
          <p>{THEORY_COPY.layers.body}</p>
        </article>
      </div>

      <section className="dimension-grid">
        <h2>{THEORY_COPY.dimensionsTitle}</h2>
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
          <h2>{THEORY_COPY.handOff.title}</h2>
          {THEORY_COPY.handOff.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </article>
        <article className="theory-card">
          <h2>{THEORY_COPY.holdOn.title}</h2>
          {THEORY_COPY.holdOn.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </article>
      </div>

      <div className="theory-note">
        <span>i</span>
        <p>{THEORY_COPY.note}</p>
      </div>

      <div className="theory-actions">
        <button className="secondary-button" type="button" onClick={onBack}>回到首页</button>
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
        <h1>先说说你平时在做什么？</h1>
        <div className="title-rule" aria-hidden="true" />
        <p>选填，不会给含活人量加分或扣分。它只帮你分清：难复制的是你的判断，还是岗位本身暂时不容易交给流程和 AI。</p>
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

      {needsAnswer && <p ref={errorRef} id="work-form-error" className="form-error" role="alert" tabIndex="-1">还没有选择。你可以答一项，也可以直接跳过。</p>}
      <div className="work-submit-panel">
        <div className="work-actions">
          <button className="primary-button" type="submit" form="work-context-form">选好了，开始测试</button>
          <button className="secondary-button" type="button" onClick={onSkip}>先跳过</button>
        </div>
        <div className="skip-note">
          <span aria-hidden="true">ⓘ</span>
          <p>跳过不影响测试，只是结果页少一栏工作场景解读。</p>
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
          <button className="active" type="button" aria-current="page">{UI_COPY.quizMenu.current}</button>
          <button type="button" onClick={() => setGuide("instructions")}>{UI_COPY.quizMenu.instructions}</button>
          <button type="button" onClick={() => setGuide("theory")}>{UI_COPY.quizMenu.theory}</button>
        </nav>
        <button type="button" onClick={onRestart}>{UI_COPY.quizMenu.restart}</button>
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
              aria-label="当前答题进度"
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
            <p>不用选“最正确”的，选你真的会做的。</p>
          </div>
        </article>

        <div className="smoke-density">
          <span>已经答到</span>
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
        <button className="detail-close" type="button" onClick={onClose} aria-label="关闭答题说明" data-dialog-initial-focus>×</button>
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
        <button className="primary-button soft" type="button" onClick={onClose}>明白了，继续答</button>
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
  const portrait = buildResultPortrait(result);
  const reading = buildResultReading(result);
  const roleLevel = roleText.includes("偏低") ? "偏低" : roleText.includes("偏高") ? "偏高" : "中等";
  const roleDetail = roleText.replace(/^岗位接手风险(?:偏低|偏高|中等)：/, "");

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
          <span>本次结果</span>
          <h1>你的含活人量</h1>
          <div className="score-number"><strong>{result.score}</strong><em>%</em></div>
          <p>{scoreHelpText(result)}</p>
        </div>
        <div className="band-block">
          <span>所处段位</span>
          <div>
            <AssetBadge src={bandBadge} alt={`${result.band.name}徽章`} label={result.band.name} variant="band" />
            <h2>{result.band.name}</h2>
          </div>
          <p>{bandRoastText(result)}</p>
        </div>
        <div className="result-actions">
          <button className="secondary-button" type="button" onClick={onRestart}>重新作答</button>
          <button className="primary-button dark" type="button" onClick={copyShare} aria-live="polite">{copyState === "done" ? "完整文案已复制" : copyState === "failed" ? "没复制上，再试一次" : "复制完整结果"}</button>
        </div>
      </div>

      <div className={`result-grid ${showRole ? "" : "no-role"}`}>
        <article className="result-card label-card">
          <h2>{UI_COPY.resultSections.label}</h2>
          <AssetBadge src={labelBadge} alt={`${result.labelDetails.name}徽章`} label={result.labelDetails.name} variant="label" />
          <h3>{result.labelDetails.name}</h3>
          <p>{result.labelDetails.plainMeaning}</p>
          <p className="label-resonance">{result.labelDetails.resonance}</p>
          <button type="button" onClick={onOpenLabel}>展开完整解读 ›</button>
        </article>

        <article className="result-card portrait-card">
          <h2>{UI_COPY.resultSections.portrait}</h2>
          <div className="portrait-copy">
            {portrait.map((paragraph, index) => <p key={`${index}-${paragraph}`}>{paragraph}</p>)}
          </div>
        </article>

        {showRole && (
          <article className="result-card role-card">
            <h2>{UI_COPY.resultSections.role}</h2>
            <strong>{roleLevel}</strong>
            <p>{roleDetail}</p>
          </article>
        )}

        <article className="result-card dimension-card">
          <h2>{UI_COPY.resultSections.dimensions}</h2>
          <p className="section-lede">数字不论优劣，只看你习惯把力气放在哪一面。</p>
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
          <h2>{UI_COPY.resultSections.interpretation}</h2>
          <div className="result-reading">
            {reading.map((paragraph, index) => <p key={`${index}-${paragraph}`}>{paragraph}</p>)}
          </div>
        </article>
      </div>

      <SharePanel result={result} onCopy={copyShare} state={copyState} />
    </section>
  );
}

function SharePanel({ result, onCopy, state }) {
  const shareText = buildShareLine(result);
  return (
    <aside className="share-panel">
      <div>
        <strong>{UI_COPY.resultSections.share}</strong>
        <p className="share-copy-preview">{shareText}</p>
      </div>
      <button className="text-button" type="button" onClick={onCopy} aria-live="polite">{state === "done" ? "完整文案已复制" : "复制整段文案"} <span>›</span></button>
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
        <button className="detail-close" type="button" onClick={onClose} aria-label="关闭结果详情" data-dialog-initial-focus>×</button>
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
        <button className="primary-button soft" type="button" onClick={onClose}>看明白了</button>
      </aside>
    </div>
  );
}

function FooterSignature() {
  return <footer className="signature">Designed by Jacob HONG</footer>;
}

export default App;
