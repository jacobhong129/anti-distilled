import { useEffect, useState } from "react";
import { assetMap, DIMENSION_SYMBOLS, publicAsset, resultSmokePath } from "../app/assets.js";

export function ArrowIcon({ direction = "right" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g transform={direction === "left" ? "rotate(180 12 12)" : undefined}>
        <path d="M5 12h13" />
        <path d="m14 7 5 5-5 5" />
      </g>
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m5 12.5 4.4 4.4L19 7.5" />
    </svg>
  );
}

export function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="6" cy="12" r="2.25" />
      <circle cx="17.5" cy="6" r="2.25" />
      <circle cx="17.5" cy="18" r="2.25" />
      <path d="m8 11 7.4-3.8M8 13l7.4 3.8" />
    </svg>
  );
}

export function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4.8 8A8 8 0 1 1 4 14" />
      <path d="M4.8 3.8V8H9" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function Brand({ onHome, compact = false, staticLabel = false }) {
  const content = (
    <>
      <img src={publicAsset(assetMap.global.brandFlask)} alt="" />
      <span>
        <strong>抗蒸性测试</strong>
        {!compact ? <small>测测你的含活人量</small> : null}
      </span>
    </>
  );

  if (staticLabel) {
    return <div className={`brand-lockup ${compact ? "compact" : ""}`} aria-label="抗蒸性测试">{content}</div>;
  }

  return (
    <button className={`brand-lockup ${compact ? "compact" : ""}`} type="button" onClick={onHome} aria-label="回到抗蒸性测试首页">
      {content}
    </button>
  );
}

export function ProductHeader({ current, onHome, onAbout, onHistory, onRestart }) {
  const showRestart = current !== "home" && current !== "theory";
  return (
    <header className="prototype-header">
      <Brand onHome={onHome} />
      <nav aria-label="页面导航">
        <button type="button" className="about-link" onClick={onAbout}>抗蒸小记</button>
        <button type="button" className={current === "history" ? "active" : ""} onClick={onHistory}>我的结果</button>
        {showRestart ? <button type="button" className="header-action" onClick={onRestart}>重新测试</button> : null}
      </nav>
    </header>
  );
}

export function PrimaryButton({ children, onClick, className = "", icon = true, disabled = false }) {
  return (
    <button className={`button primary ${className}`} type="button" onClick={onClick} disabled={disabled}>
      <span>{children}</span>
      {icon ? <ArrowIcon /> : null}
    </button>
  );
}

export function SecondaryButton({ children, onClick, className = "", iconDirection, disabled = false }) {
  return (
    <button className={`button secondary ${className}`} type="button" onClick={onClick} disabled={disabled}>
      {iconDirection === "left" ? <ArrowIcon direction="left" /> : null}
      <span>{children}</span>
      {iconDirection === "right" ? <ArrowIcon /> : null}
    </button>
  );
}

export function TextButton({ children, onClick, className = "" }) {
  return (
    <button className={`text-link ${className}`} type="button" onClick={onClick}>
      <span>{children}</span><ArrowIcon />
    </button>
  );
}

export function FooterSignature() {
  return <footer className="signature">Designed by Jacob HONG</footer>;
}

export function SmokeBackdrop({ view, score }) {
  const smoke = view === "result" || view === "share"
    ? resultSmokePath(score ?? 50)
    : view === "question"
      ? assetMap.smoke.questionMobile
      : view === "theory"
        ? assetMap.smoke.theoryEdge
        : assetMap.smoke.homeAmbient;
  return (
    <div className={`prototype-smoke smoke-${view === "result" || view === "share" ? "result" : view === "question" ? "question" : "home"}`} aria-hidden="true">
      <img src={publicAsset(smoke)} alt="" />
    </div>
  );
}

export function DimensionVisual({ dimensionKey }) {
  return (
    <svg className="dimension-visual" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <use href={`${publicAsset(assetMap.dimensions.icons)}#${DIMENSION_SYMBOLS[dimensionKey]}`} />
    </svg>
  );
}

export function AssetBadge({ src, alt, label, className = "", variant = "label" }) {
  const [failed, setFailed] = useState(false);
  const fallbackLabel = label || alt || "徽章";

  useEffect(() => setFailed(false), [src]);

  if (src && !failed) {
    return <img className={className} src={publicAsset(src)} alt={alt} onError={() => setFailed(true)} />;
  }

  return (
    <span className={`asset-badge-fallback ${variant} ${className}`} role={alt ? "img" : undefined} aria-label={alt || fallbackLabel}>
      {fallbackLabel.slice(0, 2)}
    </span>
  );
}

export function MilestoneProgress({ stage = "screening", complete = false }) {
  const stages = [
    ["screening", "初看"],
    ["followup", "深挖"],
    ["countercheck", "核对"],
    ["result", "出结果"],
  ];
  const currentIndex = complete ? stages.length - 1 : Math.max(0, stages.findIndex(([key]) => key === stage));
  return (
    <ol className="milestone-progress" aria-label="测试进度">
      {stages.map(([key, label], index) => (
        <li key={key} className={index < currentIndex ? "done" : index === currentIndex ? "current" : ""} aria-current={index === currentIndex ? "step" : undefined}>
          <span>{index < currentIndex ? <CheckIcon /> : index + 1}</span>
          <strong>{label}</strong>
        </li>
      ))}
    </ol>
  );
}
