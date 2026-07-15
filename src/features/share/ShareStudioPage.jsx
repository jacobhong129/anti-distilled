import { useMemo, useState } from "react";
import { assetMap, publicAsset } from "../../app/assets.js";
import { buildShareLine } from "../../app/result-view-model.js";
import { copyText } from "../../app/copy-text.js";
import { renderShareCard } from "../../app/share-card-renderer.js";
import { AssetBadge, Brand, PrimaryButton, SecondaryButton } from "../../components/ProductShell.jsx";
import { DimensionBars } from "../results/ResultPage.jsx";

const TONES = {
  sharp: (result) => result.labelDetails.shareLine || result.band.line,
  playful: (result) => result.labelDetails.playfulAside || result.band.playfulAside || result.band.line,
  serious: (result) => `我愿意把方法交出去，也会为那些不能照章处理的取舍负责。${result.band.growthNudge || ""}`,
};

function SegmentedControl({ label, value, options, onChange }) {
  return <fieldset className="segmented-field"><legend>{label}</legend><div>{options.map((option) => <button key={option.value} type="button" className={value === option.value ? "active" : ""} onClick={() => onChange(option.value)}>{option.label}</button>)}</div></fieldset>;
}

function ToggleRow({ label, note, checked, onChange }) {
  return <label className="toggle-row"><span><strong>{label}</strong><small>{note}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i aria-hidden="true" /></label>;
}

function SharePreview({ result, toneLine, format, showScore, showDimensions }) {
  const bandAsset = assetMap.resultBands?.[result.band.name];
  const labelAsset = assetMap.labels?.[result.labelKey] || assetMap.labels?.latent_human_variable;
  return (
    <article className={`share-preview format-${format}`} aria-label="分享卡预览">
      <img className="share-smoke" src={publicAsset(assetMap.smoke.shareCard)} alt="" aria-hidden="true" />
      <header><Brand compact staticLabel /><span>含活人量侧影</span></header>
      <div className="share-preview-main">
        {showScore ? <div className="share-score"><strong>{result.score}</strong><em>%</em></div> : <div className="share-score hidden-score">分数先留给自己</div>}
        <div className="share-band"><AssetBadge src={bandAsset} alt="" label={result.band.name} variant="band" /><div><span>所处段位</span><h2>{result.band.name}</h2></div></div>
        <blockquote>{toneLine}</blockquote>
        <div className="share-label"><AssetBadge src={labelAsset} alt="" label={result.labelDetails.name} /><strong>{result.labelDetails.name}</strong></div>
        {showDimensions ? <DimensionBars dimensions={result.dimensions} compact /> : null}
      </div>
      <footer><span>测测你的抗蒸性</span><strong>方法能复制，人不只是一套方法</strong></footer>
    </article>
  );
}

export function ShareStudioPage({ result, onBack, onNotify, onTrack }) {
  const [tone, setTone] = useState("sharp");
  const [format, setFormat] = useState("portrait");
  const [showScore, setShowScore] = useState(true);
  const [showDimensions, setShowDimensions] = useState(false);
  const [working, setWorking] = useState(false);
  const toneLine = useMemo(() => TONES[tone](result), [result, tone]);
  const shareText = useMemo(() => buildShareLine(result), [result]);

  const makeBlob = async () => renderShareCard({ result, format, toneLine, showScore, showDimensions });
  const download = async () => {
    setWorking(true);
    try {
      const blob = await makeBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `含活人量-${result.score}-${format}.png`;
      link.click();
      URL.revokeObjectURL(url);
      onTrack("share_download", { format, tone, showScore, showDimensions });
      onNotify("分享卡已经生成");
    } catch {
      onNotify("图片没生成出来，再试一次");
    } finally { setWorking(false); }
  };
  const nativeShare = async () => {
    setWorking(true);
    try {
      const blob = await makeBlob();
      const file = new File([blob], `含活人量-${result.score}.png`, { type: "image/png" });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title: "我的抗蒸性测试结果", text: shareText, files: [file] });
        onTrack("share_native", { format, tone, showScore, showDimensions });
      } else {
        await copyText(shareText);
        onTrack("share_copy", { format, tone, showScore, showDimensions });
        onNotify("设备暂不支持直接分享，文案已复制");
      }
    } catch (error) {
      if (error?.name !== "AbortError") onNotify("这次没分享出去，结果还好好留着");
    } finally { setWorking(false); }
  };
  const copy = async () => {
    const copied = await copyText(shareText);
    onTrack("share_copy", { format, tone, showScore, showDimensions });
    onNotify(copied ? "分享文案已复制" : "当前浏览器没有开放剪贴板");
  };

  return (
    <main className="share-main">
      <section className="share-intro"><button className="back-link" type="button" onClick={onBack}>← 回到结果</button><h1>把这张侧影，调成你愿意发出去的样子</h1><p>分数、六维和语气都由你决定。分享的是结果摘要，不是答题记录。</p></section>
      <div className="share-workspace">
        <div className="share-preview-wrap"><SharePreview result={result} toneLine={toneLine} format={format} showScore={showScore} showDimensions={showDimensions} /></div>
        <aside className="share-controls">
          <SegmentedControl label="卡片尺寸" value={format} onChange={setFormat} options={[{ value: "portrait", label: "4:5 竖图" }, { value: "square", label: "方形" }, { value: "text", label: "纯文字" }]} />
          <SegmentedControl label="说话语气" value={tone} onChange={setTone} options={[{ value: "sharp", label: "一句戳中" }, { value: "playful", label: "带点玩笑" }, { value: "serious", label: "稍微认真" }]} />
          <div className="privacy-controls"><h2>公开多少，由你决定</h2><ToggleRow label="显示精确分数" note="关闭后只显示段位" checked={showScore} onChange={setShowScore} /><ToggleRow label="显示六维侧影" note="默认不公开详细数据" checked={showDimensions} onChange={setShowDimensions} /></div>
          <div className="share-actions"><PrimaryButton onClick={nativeShare} disabled={working}>系统分享</PrimaryButton><SecondaryButton onClick={download} disabled={working}>{working ? "正在生成…" : "下载图片"}</SecondaryButton><button className="text-link" type="button" onClick={copy}>复制文字版 →</button></div>
          <p className="privacy-note">不会把你的答案、题目路径或内部判断依据放进分享内容。</p>
        </aside>
      </div>
    </main>
  );
}
