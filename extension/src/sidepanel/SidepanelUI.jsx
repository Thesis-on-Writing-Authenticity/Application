import PlaybackViewer from "../components/ReplayPlayer";
import StatsBar from "../components/StatsBar";
import Metrics from "../components/Metrics";
import DocumentStats from "../components/DocumentStats";
import { buildUserStats } from "../replay/statistics";
import "./SidePanelUI.css";
import Analysis from "../components/Analysis";

export default function SidePanelUI({
  loading,
  doc,
  googleToken,
  documentData,
  wordCount,
  revisions,
  analyzing,
  analyzeDocument,
  frames,
  operations,
  charCount,
  backendStatus,
  metrics,
  analysis,
  analysisLoading,
  analysisError,
}) {
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="sidepanel">

    <div className="documentInfo">
      <div className="documentInfoItem">
        <h3>Document title</h3>
        <p>{doc?.title}</p>
      </div>

      <div className="documentInfoItem">
        <h3>Document ID</h3>
        <p>{doc?.id}</p>
      </div>
    </div>
      
      <button
        className="analyzeButton"
        onClick={analyzeDocument}
        disabled={analyzing}
        >
        {analyzing ? "Analysing... this may take a second" : "Analyse Document"}
      </button>

      {documentData && (
        <div className="resultsContainer">
          {/*{googleToken && <h3>✅ Google connected</h3>}*/}

          {/*QUICK STATISTICS*/}
          <DocumentStats
            wordCount={wordCount}
            charCount={charCount}
            operations={operations}
            revisions={revisions}
          />

          {/* CONTRIBUTIONS (StatsBar)*/}
          <StatsBar
            stats={buildUserStats(frames)}
          />

          {/*ANALYSIS RESULTS (Analysis)*/}
          <Analysis analysis={analysis} />

          {/*REPLAY PLAYER (ReplayPlayer)*/}
          <PlaybackViewer frames={frames} />

          {/* BEHAVIOURAL METRICS (Metrics)*/}
          <Metrics
            metrics={metrics}
            backendStatus={backendStatus}
            analysis={analysis}
          />
        </div>
      )}
    </div>
  );
}