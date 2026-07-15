import { assetMap, publicAsset } from "../../app/assets.js";
import { DIMENSION_DETAILS, THEORY_COPY } from "../../app/product-content.js";
import { DimensionVisual, HistoryIcon, PrimaryButton, SecondaryButton, TextButton } from "../../components/ProductShell.jsx";

export function HomePage({ onStart, onLearn, onResume, onRestart, resumeAvailable, resumeAnsweredCount }) {
  return (
    <main className="home-main">
      <section className="home-copy">
        <h1>测测你的抗蒸性</h1>
        <div className="title-rule" aria-hidden="true"><i /></div>
        <p>如果把你的工作方式交给 AI、流程或一个同事 Skill，哪些能学走，哪些还得你本人在场？</p>
        <div className="home-actions">
          <PrimaryButton onClick={onStart}>开始测试</PrimaryButton>
          <TextButton onClick={onLearn}>抗蒸小记</TextButton>
        </div>
      </section>

      <figure className="distillation-art">
        <picture>
          <source media="(max-width: 760px)" srcSet={publicAsset(assetMap.global.homeDistillationMobile)} />
          <img src={publicAsset(assetMap.global.homeDistillationDesktop)} alt="人的判断和经验经过整理，成为工作流、插件、Skill 与提示词" fetchPriority="high" />
        </picture>
      </figure>

      {resumeAvailable ? (
        <section className="resume-strip" aria-label="继续上次测试">
          <div className="resume-icon"><HistoryIcon /></div>
          <div>
            <strong>上次答到第 {resumeAnsweredCount + 1} 题</strong>
            <p>进度已经替你留着。可以接着答，也可以重新来一遍。</p>
          </div>
          <div className="resume-actions">
            <PrimaryButton onClick={onResume}>继续上次</PrimaryButton>
            <SecondaryButton onClick={onRestart}>重新开始</SecondaryButton>
          </div>
        </section>
      ) : null}

      <section className={`meaning-callout ${resumeAvailable ? "" : "without-resume"}`}>
        <img src={publicAsset(assetMap.global.sparkleSeal)} alt="" />
        <div>
          <h2>方法可以复制，人不只是一套方法</h2>
          <p>含活人量看的，是流程写完以后，还留在你身上的现场、分寸和亲身经验。</p>
        </div>
        <span className="human-stamp" aria-label="人味难蒸"><b>人味</b><b>难蒸</b></span>
      </section>
    </main>
  );
}

export function TheoryPage({ onBack, onStart }) {
  return (
    <main className="theory-main">
      <section className="theory-heading">
        <button className="back-link" type="button" onClick={onBack}>← 回到首页</button>
        <span>{THEORY_COPY.subtitle}</span>
        <h1>{THEORY_COPY.title}</h1>
        <p>动作最容易教，取舍难一些，后果则不能代签。这里看的，是方法写完以后还留在现场里的那部分。</p>
      </section>

      <figure className="theory-visual">
        <img src={publicAsset(assetMap.global.homeDistillationDesktop)} alt="人的判断和经验经过整理，成为工作流、插件、Skill 与提示词" />
      </figure>

      <section className="theory-story-grid">
        <article>
          <span>01</span><h2>{THEORY_COPY.distillation.title.replace(/^一、/, "")}</h2>
          {THEORY_COPY.distillation.paragraphs.map((text) => <p key={text}>{text}</p>)}
        </article>
        <article className="layer-article">
          <span>02</span><h2>{THEORY_COPY.layers.title.replace(/^二、/, "")}</h2>
          <div className="layer-model">
            {THEORY_COPY.layers.items.map(([name, text]) => <div key={name}><strong>{name}</strong><small>{text}</small></div>)}
          </div>
          <p>{THEORY_COPY.layers.body}</p>
        </article>
      </section>

      <section className="theory-dimensions">
        <div><span>03</span><h2>六面见人</h2><p>它们不是六门功课，只是六种观察角度。</p></div>
        <div className="theory-dimension-grid">
          {Object.entries(DIMENSION_DETAILS).map(([key, item]) => (
            <article key={key}>
              <DimensionVisual dimensionKey={key} />
              <strong>{item.name}</strong>
              <p>{item.subtitle}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="theory-story-grid compact">
        <article><span>04</span><h2>{THEORY_COPY.handOff.title.replace(/^四、/, "")}</h2>{THEORY_COPY.handOff.paragraphs.map((text) => <p key={text}>{text}</p>)}</article>
        <article><span>05</span><h2>{THEORY_COPY.holdOn.title.replace(/^五、/, "")}</h2>{THEORY_COPY.holdOn.paragraphs.map((text) => <p key={text}>{text}</p>)}</article>
      </section>

      <aside className="theory-note"><strong>只作自我观察</strong><p>{THEORY_COPY.note}</p></aside>
      <div className="theory-actions"><SecondaryButton onClick={onBack}>回到首页</SecondaryButton><PrimaryButton onClick={onStart}>开始测试</PrimaryButton></div>
    </main>
  );
}
