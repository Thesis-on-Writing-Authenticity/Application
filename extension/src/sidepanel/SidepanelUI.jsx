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
    // --- Connected from App.jsx, not yet displayed. See the comment in the results container below. ---
    operations,
    charCount,
    backendStatus,
    metrics,
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

          {/*
            Anna: all of this is ready to show here — style it however you like.

            Final-document data:
              charCount   — document character count (number)
              operations  — raw writing operations from the changelog (an array).
                            Each item looks like:
                              { type: "insert" | "delete", length, timestamp, author, ... }
                            operations.length is the total number of edits. For most
                            displays prefer `metrics` below (it already has the
                            typed/deleted counts, pauses, etc.); use operations only
                            if you want the raw list or a per-type breakdown.

            backendStatus — save result: { ok, id } if saved, or { ok: false, message }

            metrics — behavioural metrics computed by the backend (null until a
            successful save). Fields:
              metrics.typedCharCount     — characters inserted
              metrics.deletedCharCount   — characters deleted
              metrics.pastedCharCount    — characters pasted (0 until paste detection)
              metrics.pasteToTypeRatio   — pasted / typed (or null)
              metrics.editEventCount     — number of delete actions
              metrics.longPauseCount     — pauses longer than 2s
              metrics.totalWritingTimeMs — first-to-last edit span, in ms

            Example:
              <p>Characters:<b> {charCount}</b></p>
              {metrics && <p>Typed:<b> {metrics.typedCharCount}</b> · Deleted:<b> {metrics.deletedCharCount}</b></p>}
          */}

          <PlaybackViewer frames={frames} />
          <StatsBar stats={buildUserStats(frames)} />
        </div>
      )}
    </div>
  );
}