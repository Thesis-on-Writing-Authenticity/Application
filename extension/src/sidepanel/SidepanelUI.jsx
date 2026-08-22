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
  analysis,
  analysisLoading,
  analysisError,
}) {
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="sidepanel">
      <h2>Writing Authenticity</h2>

      <hr />

      <h3>Document title</h3>
      <p>{doc?.title}</p>

      <h3>Document ID</h3>
      <p>{doc?.id}</p>

      <button
        className="analyzeButton"
        onClick={analyzeDocument}
        disabled={analyzing}
      >
        {analyzing
          ? "Analyzing... this may take a few seconds"
          : "Analyze Document"}
      </button>

      {documentData && (
        <div className="resultsContainer">
          {googleToken && (
            <h3>✅ Google connected</h3>
          )}

          <DocumentStats
            wordCount={wordCount}
            charCount={charCount}
            operations={operations}
            revisions={revisions}
          />

          <PlaybackViewer frames={frames} />

          <Metrics
            metrics={metrics}
            backendStatus={backendStatus}
            analysis={analysis}
            analysisLoading={analysisLoading}
            analysisError={analysisError}
          />

          <StatsBar
            stats={buildUserStats(frames)}
          />
        </div>
      )}
    </div>
  );
}