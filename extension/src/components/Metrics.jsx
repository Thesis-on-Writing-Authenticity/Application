import "./Metrics.css";

function formatWritingDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return "0 min";
  }

  const totalMinutes = Math.round(ms / 60000);

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
}

function formatPercentage(value) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  if (Number.isInteger(value)) {
    return `${value}%`;
  }

  return `${value.toFixed(1)}%`;
}

export default function Metrics({
  metrics,
  backendStatus,
  analysis,
}) {
  if (!metrics && !backendStatus && !analysis) {
    return null;
  }

  const maxCharacters = Math.max(
    metrics?.typedCharCount ?? 0,
    metrics?.deletedCharCount ?? 0,
    metrics?.pastedCharCount ?? 0
  );

  const maxEditing = Math.max(
    metrics?.editEventCount ?? 0,
    metrics?.shortPauseCount ?? 0,
    metrics?.longPauseCount ?? 0,
    metrics?.veryLongPauseCount ?? 0
  );

  const getWidth = (value, max) => {
    if (!value || !max) {
      return "0%";
    }

    return `${(value / max) * 100}%`;
  };

  const typedCharCount = metrics?.typedCharCount ?? 0;
  const pastedCharCount = metrics?.pastedCharCount ?? 0;

  const totalCharacters =
    typedCharCount + pastedCharCount;

  const typedPercentage =
    totalCharacters > 0
      ? (typedCharCount / totalCharacters) * 100
      : 0;

  const pastedPercentage =
    totalCharacters > 0
      ? (pastedCharCount / totalCharacters) * 100
      : 0;

  const sessionBreakCount = metrics?.sessionBreakCount ?? 0;
  const sessionBreakTotalMs = metrics?.sessionBreakTotalMs ?? 0;

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
                  width: getWidth(
                    metrics.typedCharCount,
                    maxCharacters
                  ),
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
                  width: getWidth(
                    metrics.pastedCharCount,
                    maxCharacters
                  ),
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
                  width: getWidth(
                    metrics.deletedCharCount,
                    maxCharacters
                  ),
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
                  width: getWidth(
                    metrics.editEventCount,
                    maxEditing
                  ),
                }}
              />
            </div>

            <b>{metrics.editEventCount}</b>
          </div>

          <h4>Pause Activity</h4>

          <div className="metricRow">
            <span>Short Pauses (1&ndash;5s)</span>

            <div className="metricBarContainer">
              <div
                className="metricBar"
                style={{
                  width: getWidth(
                    metrics.shortPauseCount,
                    maxEditing
                  ),
                }}
              />
            </div>

            <b>{metrics.shortPauseCount ?? 0}</b>
          </div>

          <div className="metricRow">
            <span>Long Pauses (5&ndash;15s)</span>

            <div className="metricBarContainer">
              <div
                className="metricBar"
                style={{
                  width: getWidth(
                    metrics.longPauseCount,
                    maxEditing
                  ),
                }}
              />
            </div>

            <b>{metrics.longPauseCount ?? 0}</b>
          </div>

          <div className="metricRow">
            <span>Very Long Pauses (15s+)</span>

            <div className="metricBarContainer">
              <div
                className="metricBar"
                style={{
                  width: getWidth(
                    metrics.veryLongPauseCount,
                    maxEditing
                  ),
                }}
              />
            </div>

            <b>{metrics.veryLongPauseCount ?? 0}</b>
          </div>

          {sessionBreakCount > 0 && (
            <div className="metricRow sessionBreakRow">
              <span>Breaks (10min+)</span>

              <span className="sessionBreakDetail">
                {sessionBreakCount} break
                {sessionBreakCount === 1 ? "" : "s"}, totalling{" "}
                {formatWritingDuration(sessionBreakTotalMs)}
              </span>
            </div>
          )}

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
                <strong>
                  {formatPercentage(pastedPercentage)}
                </strong>

                <span>pasted</span>
              </div>
            </div>

            <div className="donutLegend">
              <div>
                <span className="legendDot typedDot"></span>

                <span>Typed</span>

                <b>
                  {typedCharCount} (
                  {formatPercentage(typedPercentage)})
                </b>
              </div>

              <div>
                <span className="legendDot pastedDot"></span>

                <span>Pasted</span>

                <b>
                  {pastedCharCount} (
                  {formatPercentage(pastedPercentage)})
                </b>
              </div>
            </div>
          </div>

  
          <div>
            <span>First-to-last edit span </span>

            <b>
              {formatWritingDuration(
                metrics.totalWritingTimeMs
              )}
            </b>
          </div>

          {sessionBreakCount > 0 && (
            <div>
              <span>Active writing time </span>

              <b>
                {formatWritingDuration(
                  metrics.activeWritingTimeMs
                )}
              </b>
            </div>
          )}
        </>
      )}

      {backendStatus && (
        <p>
          Backend:
          <b>
            {" "}
            {backendStatus.ok
              ? `Saved successfully (ID ${backendStatus.id})`
              : backendStatus.message}
          </b>
        </p>
      )}

      {analysis && (
        <>
          <hr />

          <div className="authenticityAnalysis">
            <h3>Authenticity Analysis</h3>

            <div className="scoreHeader">
              <div>
                <span className="scoreLabel">
                  Authenticity Score
                </span>

                <div className="scoreValue">
                  {Math.round(
                    (analysis.analysis?.score ?? 0) * 100
                  )}
                  %
                </div>
              </div>

              <div className="scoreVerdict">
                {(analysis.analysis?.verdict ??
                  "unknown"
                ).replace(/_/g, " ")}
              </div>
            </div>

            <div className="scoreBarContainer">
              <div
                className="scoreBar"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(
                      100,
                      (analysis.analysis?.score ??
                        0) * 100
                    )
                  )}%`,
                }}
              />
            </div>

            {analysis.analysis?.reasons?.length > 0 && (
              <div className="analysisReasons">
                <h4>Analysis Factors</h4>

                <ul>
                  {analysis.analysis.reasons.map(
                    (reason, index) => (
                      <li key={index}>
                        {reason}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}