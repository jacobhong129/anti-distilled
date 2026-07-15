import { useEffect, useRef, useState } from "react";
import { assetMap, publicAsset } from "../../app/assets.js";
import { QUESTION_GUIDES } from "../../app/product-content.js";
import { ArrowIcon, Brand, CheckIcon, CloseIcon, MilestoneProgress, SecondaryButton } from "../../components/ProductShell.jsx";
import { useDialogA11y } from "../../hooks/use-dialog-a11y.js";

export function QuestionPage({ currentItem, engine, history, progress, onAnswer, onPrevious, onExit }) {
  const [selectedKey, setSelectedKey] = useState(null);
  const [guide, setGuide] = useState(null);
  const headingRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    window.clearTimeout(timerRef.current);
    setSelectedKey(null);
    const frame = window.requestAnimationFrame(() => headingRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timerRef.current);
    };
  }, [currentItem?.id]);

  if (!currentItem) return null;
  const options = engine.orderedOptions(currentItem);
  const selectOption = (optionKey) => {
    if (selectedKey) return;
    setSelectedKey(optionKey);
    timerRef.current = window.setTimeout(() => onAnswer(optionKey), 220);
  };

  return (
    <div className="question-layout">
      <aside className="question-side">
        <Brand onHome={onExit} />
        <div className="side-progress">
          <span>这次会走到哪里</span>
          <MilestoneProgress stage={progress.stage} />
        </div>
        <div className="side-helpers">
          <button type="button" onClick={() => setGuide("instructions")}>答题须知</button>
          <button type="button" onClick={() => setGuide("theory")}>抗蒸小记</button>
        </div>
        <button className="side-exit" type="button" onClick={onExit}>退出，进度会继续保存</button>
      </aside>

      <main className="question-main">
        <header className="question-mobile-header">
          <button type="button" onClick={onExit} aria-label="退出答题"><ArrowIcon direction="left" /></button>
          <Brand compact onHome={onExit} />
          <button type="button" onClick={() => setGuide("instructions")}>说明</button>
        </header>

        <section className="question-stage">
          <div><strong>{progress.label}</strong><span>{progress.intro}</span></div>
          <p><b>{progress.answered}</b> 题已答 · 通常 16–24 题</p>
        </section>
        <div className="question-mobile-progress"><MilestoneProgress stage={progress.stage} /></div>

        <article className="question-card">
          <h1 ref={headingRef} tabIndex="-1">{currentItem.question}</h1>
          <div className="option-list" role="radiogroup" aria-label="请选择最像你平时反应的一项">
            {options.map((option, index) => {
              const active = selectedKey === option.key;
              return (
                <button
                  key={option.key}
                  className={`option-card ${active ? "selected" : ""}`}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={selectedKey !== null}
                  onClick={() => selectOption(option.key)}
                >
                  <span className="option-index">{index + 1}</span>
                  <span>{option.text}</span>
                  <i aria-hidden="true">{active ? <CheckIcon /> : null}</i>
                </button>
              );
            })}
          </div>
          <div className="question-footer">
            <SecondaryButton onClick={onPrevious} iconDirection="left" disabled={!history.length}>上一题</SecondaryButton>
            <p>没有标准答案，选最接近你平时反应的那一项。</p>
          </div>
        </article>

        <div className="question-density" aria-hidden="true">
          <span>追问正在变具体</span>
          <div><img src={publicAsset(assetMap.smoke.questionDensity)} alt="" /><i style={{ width: `${progress.percent}%` }} /></div>
          <strong>{progress.label}</strong>
        </div>
      </main>
      {guide ? <QuestionGuide guide={QUESTION_GUIDES[guide]} onClose={() => setGuide(null)} /> : null}
    </div>
  );
}

function QuestionGuide({ guide, onClose }) {
  const dialogRef = useDialogA11y(onClose);
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className="about-dialog question-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="question-guide-title" tabIndex="-1">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="关闭答题说明" data-dialog-initial-focus><CloseIcon /></button>
        <span>答得像自己就好</span>
        <h2 id="question-guide-title">{guide.title}</h2>
        <p>{guide.subtitle}</p>
        <div className="guide-sections">
          {guide.sections.map(([title, text]) => <section key={title}><h3>{title}</h3><p>{text}</p></section>)}
        </div>
      </section>
    </div>
  );
}
