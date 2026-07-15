import { assetMap, publicAsset, resultSmokePath } from "../../app/assets.js";
import { DIMENSION_DETAILS } from "../../app/product-content.js";
import { bandRoastText, buildResultPortrait, scoreHelpText } from "../../app/result-view-model.js";
import { ArrowIcon, AssetBadge, PrimaryButton, SecondaryButton, ShareIcon } from "../../components/ProductShell.jsx";

export function DimensionBars({ dimensions, compact = false, onOpen }) {
  return (
    <div className={`dimension-bars ${compact ? "compact" : ""}`}>
      {dimensions.map((dimension) => (
        <button key={dimension.key} type="button" onClick={() => onOpen?.(dimension)}>
          <strong>{dimension.name}</strong>
          <i><b style={{ width: `${dimension.value}%`, background: DIMENSION_DETAILS[dimension.key]?.color }} /></i>
          <em>{dimension.value}</em>
        </button>
      ))}
    </div>
  );
}

export function ResultPage({ result, roleInsight, onShare, onRestart, onOpenLabel, onOpenDimension, onOpenWork }) {
  const bandBadge = assetMap.resultBands?.[result.band.name];
  const labelBadge = assetMap.labels?.[result.labelKey] || assetMap.labels?.latent_human_variable;
  const portrait = buildResultPortrait(result);

  return (
    <main className="result-main">
      <section className="result-hero">
        <img className="result-smoke" src={publicAsset(resultSmokePath(result.score))} alt="" aria-hidden="true" />
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
          <p>{result.band.line}</p>
        </div>
        <div className="result-primary-actions">
          <PrimaryButton className="share-main" onClick={onShare}><ShareIcon /> 生成我的分享卡</PrimaryButton>
          <button className="text-link" type="button" onClick={onOpenLabel}>继续看完整解读 <ArrowIcon /></button>
        </div>
      </section>

      <section className="result-content">
        <article className="result-card label-summary label-card">
          <div className="result-card-heading"><span>判断底色</span><button type="button" onClick={onOpenLabel}>展开解读 <ArrowIcon /></button></div>
          <div className="label-layout">
            <AssetBadge src={labelBadge} alt={`${result.labelDetails.name}标签徽章`} label={result.labelDetails.name} variant="label" />
            <div>
              <h2>{result.labelDetails.name}</h2>
              <p>{result.labelDetails.plainMeaning}</p>
              <blockquote>“{result.labelDetails.shareLine || result.labelDetails.resonance}”</blockquote>
            </div>
          </div>
        </article>

        <article className="result-card result-portrait evidence-card">
          <span>结果小传</span>
          <h2>{result.band.line}</h2>
          <p>{portrait[1] || result.band.summary}</p>
          <p className="playful-copy">顺手说一句：{bandRoastText(result)}</p>
        </article>

        <article className="result-card dimensions-card dimension-card">
          <div className="result-card-heading">
            <div><span>六维侧影</span><p>数字不论优劣，只看你习惯把力气放在哪一面。</p></div>
            <button type="button" onClick={() => onOpenDimension(result.dimensions[0])}>逐项查看 <ArrowIcon /></button>
          </div>
          <DimensionBars dimensions={result.dimensions} onOpen={onOpenDimension} />
        </article>

        <article className={`result-card work-unlock ${roleInsight ? "unlocked" : ""}`}>
          <div>
            <span>{roleInsight ? "工作映照" : "还想再看一面？"}</span>
            <h2>{roleInsight ? "这套判断在工作里会怎么冒出来" : "补充工作场景，解锁一段工作映照"}</h2>
            <p>{roleInsight || "只影响岗位语境解释，不改变个人含活人量。大约需要 20 秒，也可以不填。"}</p>
          </div>
          <SecondaryButton onClick={onOpenWork}>{roleInsight ? "重新选择" : "补充工作场景"}</SecondaryButton>
        </article>

        <aside className="result-next-step">
          <div><strong>先留一张，再慢慢看</strong><p>分享卡不会带上答案、题目路径或内部判断依据。</p></div>
          <PrimaryButton onClick={onShare}>去做分享卡</PrimaryButton>
          <button type="button" onClick={onRestart}>隔一阵再测一次</button>
        </aside>
      </section>
    </main>
  );
}
