import PlaybackViewer from "../components/ReplayPlayer";
import StatsBar from "../components/StatsBar";
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
        {analyzing ? "Analyzing..." : "Analyze Document"}
      </button>

      {documentData && (
        <div className="resultsContainer">
          {googleToken && <h3>✅ Google connected</h3>}
          <hr />
          <h3>Statistics</h3>
          <p>
            Words:
            <b> {wordCount}</b>
          </p>
          <p>
            Revisions:
            <b> {revisions.length}</b>
          </p>

          <PlaybackViewer frames={frames} />
          <StatsBar stats={buildUserStats(frames)} />
        </div>
      )}
    </div>
  );
}