import { useEffect, useMemo, useState } from "react";
import { assetMap, publicAsset } from "../../app/assets.js";
import { buildDimensionDetail, buildLabelDetail } from "../../app/result-view-model.js";
import { WORK_ROLE_OPTIONS } from "../../app/role-context.js";
import { AssetBadge, CheckIcon, CloseIcon, PrimaryButton } from "../../components/ProductShell.jsx";
import { useDialogA11y } from "../../hooks/use-dialog-a11y.js";

export function ResultDetailDrawer({ detail, onClose }) {
  const dialogRef = useDialogA11y(onClose);
  const dimensions = detail.result.dimensions || [];
  const [tab, setTab] = useState(detail.kind === "dimension" ? "dimension" : "label");
  const [dimensionKey, setDimensionKey] = useState(detail.dimensionKey || dimensions[0]?.key);
  const labelDetail = useMemo(() => buildLabelDetail(detail.result), [detail.result]);
  const dimension = dimensions.find((item) => item.key === dimensionKey) || dimensions[0];
  const content = tab === "dimension" && dimension ? buildDimensionDetail(dimension, detail.result) : labelDetail;

  useEffect(() => {
    setTab(detail.kind === "dimension" ? "dimension" : "label");
    setDimensionKey(detail.dimensionKey || dimensions[0]?.key);
  }, [detail.kind, detail.dimensionKey]);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside ref={dialogRef} className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title" tabIndex="-1">
        <img className="drawer-smoke" src={publicAsset(assetMap.smoke.drawerHeader)} alt="" aria-hidden="true" />
        <button className="dialog-close" type="button" onClick={onClose} aria-label="关闭结果详情" data-dialog-initial-focus><CloseIcon /></button>
        <div className="detail-tabs" role="tablist" aria-label="结果详情类型">
          <button role="tab" aria-selected={tab === "label"} className={tab === "label" ? "active" : ""} type="button" onClick={() => setTab("label")}>判断标签</button>
          <button role="tab" aria-selected={tab === "dimension"} className={tab === "dimension" ? "active" : ""} type="button" onClick={() => setTab("dimension")}>维度详情</button>
        </div>

        {tab === "dimension" ? (
          <div className="dimension-selector" role="tablist" aria-label="选择维度">
            {dimensions.map((item) => (
              <button key={item.key} role="tab" aria-selected={item.key === dimension?.key} className={item.key === dimension?.key ? "active" : ""} type="button" onClick={() => setDimensionKey(item.key)}>
                <span>{item.name}</span><strong>{item.value}</strong>
              </button>
            ))}
          </div>
        ) : null}

        <header className={`detail-header ${tab === "dimension" ? "dimension-detail-header" : ""}`}>
          <div><span>{content.type}</span><h2 id="detail-title">{content.title}</h2><p>{content.subtitle}</p></div>
          {tab === "dimension" ? <strong style={{ color: dimension ? `var(--dimension-${dimension.key.toLowerCase()}, var(--green))` : undefined }}>{dimension?.value}</strong> : <AssetBadge src={content.asset} alt={`${content.title}标签徽章`} label={content.title} />}
        </header>
        <div className="detail-sections">
          {content.sections.filter(([, text]) => text).map(([title, text]) => <section key={title}><h3>{title}</h3><p>{text}</p></section>)}
        </div>
      </aside>
    </div>
  );
}

export function WorkContextDialog({ initialRoleId, onClose, onSave }) {
  const dialogRef = useDialogA11y(onClose);
  const [roleId, setRoleId] = useState(initialRoleId || "product");
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className="work-dialog" role="dialog" aria-modal="true" aria-labelledby="work-dialog-title" tabIndex="-1">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="关闭工作场景选择" data-dialog-initial-focus><CloseIcon /></button>
        <span>可选补充</span>
        <h2 id="work-dialog-title">你现在主要做哪类工作？</h2>
        <p>这不会改变个人含活人量，只用来补一段工作里的解释。</p>
        <div className="role-grid" role="radiogroup" aria-label="工作类型">
          {WORK_ROLE_OPTIONS.map(([value, label]) => (
            <button key={value} role="radio" aria-checked={roleId === value} className={roleId === value ? "selected" : ""} type="button" onClick={() => setRoleId(value)}>
              <i aria-hidden="true">{roleId === value ? <CheckIcon /> : null}</i>{label}
            </button>
          ))}
        </div>
        <PrimaryButton onClick={() => onSave(roleId)}>选好了，看看工作映照</PrimaryButton>
      </section>
    </div>
  );
}
