import "./Metrics.css";

export default function Metrics({ metrics, backendStatus }) {
  if (!metrics && !backendStatus) {
    return null;
  }

  const maxCharacters = Math.max(
    metrics?.typedCharCount ?? 0,
    metrics?.deletedCharCount ?? 0,
    metrics?.pastedCharCount ?? 0
  );

  const maxEditing = Math.max(
    metrics?.editEventCount ?? 0,
    metrics?.longPauseCount ?? 0
  );

  const getWidth = (value, max) => {
    if (!value || !max) return "0%";
    return `${(value / max) * 100}%`;
  };

  const totalCharacters =
  metrics.typedCharCount + metrics.pastedCharCount;

  const typedPercentage =
    totalCharacters > 0
      ? (metrics.typedCharCount / totalCharacters) * 100
      : 0;

  const pastedPercentage =
    totalCharacters > 0
      ? (metrics.pastedCharCount / totalCharacters) * 100
      : 0;

  return (
    <>
      <hr />
      <h3>Behavioural Metrics</h3>

      {metrics && (
        <>
          <h4>Character Activity</h4>

          <div className="metricRow">
            <span>Typed</span>
            <div className="metricBarContainer">
              <div
                className="metricBar"
                style={{
                  width: getWidth(metrics.typedCharCount, maxCharacters),
                }}
              />
            </div>
            <b>{metrics.typedCharCount}</b>
          </div>

          <div className="metricRow">
            <span>Pasted</span>
            <div className="metricBarContainer">
              <div
                className="metricBar"
                style={{
                  width: getWidth(metrics.pastedCharCount, maxCharacters),
                }}
              />
            </div>
            <b>{metrics.pastedCharCount}</b>
          </div>

          <div className="metricRow">
            <span>Deleted</span>
            <div className="metricBarContainer">
              <div
                className="metricBar"
                style={{
                  width: getWidth(metrics.deletedCharCount, maxCharacters),
                }}
              />
            </div>
            <b>{metrics.deletedCharCount}</b>
          </div>

          <h4>Editing Behaviour</h4>

          <div className="metricRow">
            <span>Delete Events</span>
            <div className="metricBarContainer">
              <div
                className="metricBar"
                style={{
                  width: getWidth(metrics.editEventCount, maxEditing),
                }}
              />
            </div>
            <b>{metrics.editEventCount}</b>
          </div>

          <div className="metricRow">
            <span>Long Pauses</span>
            <div className="metricBarContainer">
              <div
                className="metricBar"
                style={{
                  width: getWidth(metrics.longPauseCount, maxEditing),
                }}
              />
            </div>
            <b>{metrics.longPauseCount}</b>
          </div>

          <div className="pasteTypeChart">
            <div
              className="donut"
              style={{
                background: `conic-gradient(
                  #2e7d32 0% ${typedPercentage}%,
                  #1976d2 ${typedPercentage}% 100%
                )`,
              }}
            >
              <div className="donutCenter">
                {metrics.pasteToTypeRatio == null
                  ? "-"
                  : metrics.pasteToTypeRatio.toFixed(2)}
              </div>
            </div>

            <div className="donutLegend">
              <div>
                <span className="legendDot typedDot"></span>
                Typed: <b>{metrics.typedCharCount}</b>
              </div>

              <div>
                <span className="legendDot pastedDot"></span>
                Pasted: <b>{metrics.pastedCharCount}</b>
              </div>
            </div>
          </div>

          <div>
            <span>First-to-last edit span </span>
              <b>
                {(metrics.totalWritingTimeMs / 3600000).toFixed(2)} h
              </b>
            </div>

        </>
      )}

      {backendStatus && (
        <p>Backend:
          <b>
            {" "}
            {backendStatus.ok
              ? `Saved successfully (ID ${backendStatus.id})`
              : backendStatus.message}
          </b>
        </p>
      )}
    </>
  );
}



          {/* TALTEEN:
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