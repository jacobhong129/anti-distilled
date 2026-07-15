import { useEffect, useMemo, useState } from "react";
import { trackProductEvent } from "./app/product-events.js";
import { buildRoleContextReading, normalizeRoleContext } from "./app/role-context.js";
import { ProductHeader, FooterSignature, SmokeBackdrop } from "./components/ProductShell.jsx";
import { QuestionPage } from "./features/assessment/QuestionPage.jsx";
import { HistoryPage } from "./features/history/HistoryPage.jsx";
import { HomePage, TheoryPage } from "./features/home/HomePages.jsx";
import { ResultDetailDrawer, WorkContextDialog } from "./features/results/ResultDialogs.jsx";
import { ResultPage } from "./features/results/ResultPage.jsx";
import { ShareStudioPage } from "./features/share/ShareStudioPage.jsx";
import { useAssessmentFlow } from "./hooks/use-assessment-flow.js";
import { useGameConfig } from "./hooks/use-game-config.js";
import { useResultHistory } from "./hooks/use-result-history.js";

function AppStatus({ error, loading, onRetry }) {
  return (
    <div className="prototype-app"><div className="screen status-screen"><main className="app-status" role={error ? "alert" : "status"} aria-live="polite"><span>{error ? "题目没能顺利载入" : "正在把题目摆好"}</span><h1>{error ? "刚才那一下没接住" : "稍等，马上开场"}</h1><p>{error ? "已经答过的内容还在。点一下重试，我们从刚才的地方继续。" : "顺便给每道题找好位置，很快就好。"}</p>{error ? <button className="button primary" type="button" onClick={onRetry} disabled={loading}>{loading ? "正在重试…" : "再试一次"}</button> : null}</main><FooterSignature /></div></div>
  );
}

function App() {
  const { config, error, loading, retry } = useGameConfig();
  if (!config) return <AppStatus error={error} loading={loading} onRetry={retry} />;
  return <AssessmentApp config={config} />;
}

function AssessmentApp({ config }) {
  const flow = useAssessmentFlow(config);
  const historyStore = useResultHistory(config.version);
  const [detail, setDetail] = useState(null);
  const [workOpen, setWorkOpen] = useState(false);
  const [archivedEntry, setArchivedEntry] = useState(null);
  const [archivedRoleContext, setArchivedRoleContext] = useState(null);
  const [notice, setNotice] = useState("");

  const visibleResult = archivedEntry?.result || flow.result;
  const visibleRoleContext = archivedEntry ? archivedRoleContext : flow.roleContext;
  const roleInsight = useMemo(() => buildRoleContextReading(visibleRoleContext), [visibleRoleContext]);

  useEffect(() => {
    if (flow.result && flow.sessionId) historyStore.saveResult(flow.result, flow.roleContext, flow.sessionId);
  }, [flow.result, flow.roleContext, flow.sessionId, historyStore.saveResult]);

  useEffect(() => {
    setDetail(null);
    setWorkOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const titles = { home: "抗蒸性测试", theory: "抗蒸小记｜抗蒸性测试", question: "正在答题｜抗蒸性测试", result: "我的含活人量结果｜抗蒸性测试", share: "制作分享卡｜抗蒸性测试", history: "我的结果｜抗蒸性测试" };
    document.title = titles[flow.view] || titles.home;
  }, [flow.view]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const start = () => {
    setArchivedEntry(null);
    trackProductEvent("home_start");
    flow.startAssessment({ skipped: true });
  };
  const retest = () => {
    setArchivedEntry(null);
    trackProductEvent("retest_start");
    flow.startAssessment({ skipped: true });
  };
  const goHome = () => {
    setArchivedEntry(null);
    flow.setView("home");
  };
  const openHistory = () => {
    setArchivedEntry(null);
    trackProductEvent("history_open", { historyCount: historyStore.entries.length });
    flow.setView("history");
  };
  const answer = (optionKey) => {
    const stage = flow.engine.progress.stage;
    const result = flow.answer(optionKey);
    trackProductEvent("assessment_answer", { answeredCount: flow.engine.progress.answered, stage });
    if (result) trackProductEvent("assessment_complete", { answeredCount: flow.engine.progress.answered, scoreBand: result.band.name });
  };
  const openLabel = () => {
    if (!visibleResult) return;
    trackProductEvent("result_detail_open", { detailType: "label" });
    setDetail({ kind: "label", result: visibleResult, dimensionKey: visibleResult.dimensions[0]?.key });
  };
  const openDimension = (dimension) => {
    if (!visibleResult || !dimension) return;
    trackProductEvent("result_detail_open", { detailType: "dimension" });
    setDetail({ kind: "dimension", result: visibleResult, dimensionKey: dimension.key });
  };
  const openWork = () => {
    trackProductEvent("work_context_open");
    setWorkOpen(true);
  };
  const saveWork = (roleId) => {
    const context = normalizeRoleContext(roleId);
    if (!context) return;
    if (archivedEntry) setArchivedRoleContext(context);
    else flow.updateRoleContext(context);
    trackProductEvent("work_context_saved", { roleId });
    setWorkOpen(false);
    setNotice("工作映照已经补上，分数没有变化");
  };
  const openShare = () => {
    trackProductEvent("share_open");
    flow.setView("share");
  };
  const openArchived = (entry) => {
    setArchivedEntry(entry);
    setArchivedRoleContext(entry.roleContext || null);
    flow.setView("result");
  };

  let content;
  if (flow.view === "theory") content = <TheoryPage onBack={goHome} onStart={start} />;
  else if (flow.view === "question") content = <QuestionPage currentItem={flow.currentItem} engine={flow.engine} history={flow.history} progress={flow.engine.progress} onAnswer={answer} onPrevious={flow.previous} onExit={() => { trackProductEvent("assessment_exit", { answeredCount: flow.engine.progress.answered, stage: flow.engine.progress.stage }); flow.exitToHome(); }} />;
  else if (flow.view === "result" && visibleResult) content = <ResultPage result={visibleResult} roleInsight={roleInsight} onShare={openShare} onRestart={retest} onOpenLabel={openLabel} onOpenDimension={openDimension} onOpenWork={openWork} />;
  else if (flow.view === "share" && visibleResult) content = <ShareStudioPage result={visibleResult} onBack={() => flow.setView("result")} onNotify={setNotice} onTrack={trackProductEvent} />;
  else if (flow.view === "history") content = <HistoryPage entries={historyStore.entries} onOpen={openArchived} onRetest={retest} onClear={() => { historyStore.clearHistory(); setNotice("这台设备上的历史结果已清除"); }} />;
  else content = <HomePage onStart={start} onLearn={() => flow.setView("theory")} onResume={() => { if (flow.resumeAssessment()) trackProductEvent("assessment_resume", { answeredCount: flow.resumeAnsweredCount }); }} onRestart={start} resumeAvailable={flow.resumeAvailable} resumeAnsweredCount={flow.resumeAnsweredCount} />;

  const standardHeader = flow.view !== "question";
  return (
    <div className="prototype-app">
      <div className={`screen ${flow.view}-screen`}>
        <SmokeBackdrop view={flow.view} score={visibleResult?.score} />
        {standardHeader ? <ProductHeader current={flow.view} onHome={goHome} onAbout={() => flow.setView("theory")} onHistory={openHistory} onRestart={retest} /> : null}
        {content}
        {standardHeader ? <FooterSignature /> : null}
      </div>
      {detail ? <ResultDetailDrawer detail={detail} onClose={() => setDetail(null)} /> : null}
      {workOpen ? <WorkContextDialog initialRoleId={visibleRoleContext?.roleId} onClose={() => setWorkOpen(false)} onSave={saveWork} /> : null}
      <div className={`toast ${notice ? "visible" : ""}`} role="status" aria-live="polite">{notice}</div>
    </div>
  );
}

export default App;
