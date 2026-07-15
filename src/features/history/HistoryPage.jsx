import { DIMENSION_DETAILS } from "../../app/product-content.js";
import { ArrowIcon, HistoryIcon, PrimaryButton, SecondaryButton } from "../../components/ProductShell.jsx";

function relativeDate(timestamp) {
  const days = Math.max(0, Math.round((Date.now() - timestamp) / 86400000));
  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 30) return `${days} 天前`;
  if (days < 365) return `${Math.round(days / 30)} 个月前`;
  return new Date(timestamp).toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" });
}

function HistoryCompare({ latest, previous }) {
  if (!latest || !previous) return null;
  const previousByKey = new Map(previous.result.dimensions.map((item) => [item.key, item.value]));
  const deltas = latest.result.dimensions.map((item) => ({ ...item, before: previousByKey.get(item.key) ?? item.value, delta: item.value - (previousByKey.get(item.key) ?? item.value) }));
  const mostChanged = [...deltas].sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))[0];
  return (
    <section className="history-compare">
      <div className="compare-heading"><div><span>最近一次变化</span><h2>不是变好或变坏，是这次哪些判断更愿意露面</h2></div><div className="compare-legend"><i className="now" />最近一次 <i className="before" />上一次</div></div>
      <div className="compare-bars">
        {deltas.map((item) => <div key={item.key}><strong>{item.name}</strong><span><i className="before" style={{ width: `${item.before}%` }} /><i className="now" style={{ width: `${item.value}%`, background: DIMENSION_DETAILS[item.key]?.color }} /></span><em>{item.delta > 0 ? "+" : ""}{item.delta}</em></div>)}
      </div>
      <p className="compare-note">这次变化最明显的是{mostChanged.name}：相差 {Math.abs(mostChanged.delta)}。它更像状态和注意力的移动，不必急着把它写成进步或退步。</p>
    </section>
  );
}

export function HistoryPage({ entries, onOpen, onRetest, onClear }) {
  const latest = entries[0];
  const previous = entries[1];
  return (
    <main className="history-main">
      <section className="history-heading">
        <h1>你的几张侧影</h1>
        <p>它们不是成绩单，只是不同时间、不同状态下留下的近照。结果只保存在这台设备上。</p>
        <PrimaryButton onClick={onRetest}>隔一阵再测一次</PrimaryButton>
      </section>

      {entries.length ? (
        <>
          <section className={`history-timeline ${entries.length === 1 ? "single" : ""}`} aria-label="历史结果">
            {entries.slice(0, 6).map((entry, index) => (
              <button key={entry.id} type="button" className={index === 0 ? "current" : ""} onClick={() => onOpen(entry)}>
                <span>{relativeDate(entry.completedAt)}</span><strong>{entry.result.score}%</strong><div><b>{entry.result.band.name}</b><em>{entry.result.labelDetails.name}</em></div><ArrowIcon />
              </button>
            ))}
          </section>
          <HistoryCompare latest={latest} previous={previous} />
          <section className="return-card"><div><span>下次回来时</span><h2>看看这套判断还像不像现在的你</h2><p>建议间隔 14–30 天，不必为了刷新分数频繁重测。</p></div><SecondaryButton onClick={() => onOpen(latest)}>查看最近结果</SecondaryButton></section>
          <button className="history-clear" type="button" onClick={onClear}>清除这台设备上的历史结果</button>
        </>
      ) : (
        <section className="history-empty">
          <div><HistoryIcon /></div><span>这里还没有侧影</span><h2>做完一次测试，结果会留在这台设备上</h2><p>不会保存你的具体答案，只留分数、段位、标签和六维侧影，方便以后回来比较。</p><PrimaryButton onClick={onRetest}>开始第一次测试</PrimaryButton>
        </section>
      )}
    </main>
  );
}
