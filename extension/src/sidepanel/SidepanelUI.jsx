import PlaybackViewer from "../components/ReplayPlayer";
import StatsBar from "../components/StatsBar";
import Metrics from "../components/Metrics";
import DocumentStats from "../components/DocumentStats";
import { buildUserStats } from "../replay/statistics";
import "./SidePanelUI.css";

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
})

{
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
        {analyzing ? "Analyzing... this may take a minute or two" : "Analyze Document"}
      </button>

      {documentData && (
        <div className="resultsContainer">
          {/*{googleToken && <h3>✅ Google connected</h3>}*/}

          {/* COMPONENTS*/}

          {/* INITIAL STATISTICS */}
          <DocumentStats
            wordCount={wordCount}
            charCount={charCount}
            operations={operations}
            revisions={revisions}
          />

          {/* PLAYBACK VIEWER (Replay Player) */}
          <PlaybackViewer frames={frames} />

          {/* BEHAVIOURAL METRICS (Metrics)*/}
          <Metrics metrics={metrics} backendStatus={backendStatus} />

          {/* CONTRIBUTIONS BY USER (StatsBar) */}
          <StatsBar stats={buildUserStats(frames)} />
        </div>
      )}
    </div>
  );
}