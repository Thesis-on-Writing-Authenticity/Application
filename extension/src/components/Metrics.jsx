import "./Metrics.css";
import { formatWritingDuration, formatPercentage } from "../utils/formatters";

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
    (metrics?.typedCharCount ?? 0) + (metrics?.pastedCharCount ?? 0);

  const typedPercentage =
    totalCharacters > 0
      ? ((metrics?.typedCharCount ?? 0) / totalCharacters) * 100
      : 0;

  const totalTypedDeleted =
    (metrics?.typedCharCount ?? 0) + (metrics?.deletedCharCount ?? 0);

  const typedDeletedPercentage =
    totalTypedDeleted > 0
      ? ((metrics?.typedCharCount ?? 0) / totalTypedDeleted) * 100
      : 0;

  const deletedToTypedRatio =
    (metrics?.typedCharCount ?? 0) > 0
      ? (metrics?.deletedCharCount ?? 0) / metrics.typedCharCount
      : null;

  const pastedPercentage =
    totalCharacters > 0
      ? (pastedCharCount / totalCharacters) * 100
      : 0;

  const sessionBreakCount = metrics?.sessionBreakCount ?? 0;
  const sessionBreakTotalMs = metrics?.sessionBreakTotalMs ?? 0;

  const shortPause = metrics.shortPauseCount ?? 0;
  const longPause = metrics.longPauseCount ?? 0;
  const veryLongPause = metrics.veryLongPauseCount ?? 0;

  const totalPauseCount =
    shortPause + longPause + veryLongPause;

  const shortPausePercentage =
    totalPauseCount === 0
      ? 0
      : (shortPause / totalPauseCount) * 100;

  const longPausePercentage =
    totalPauseCount === 0
      ? 0
      : (longPause / totalPauseCount) * 100;

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
                className="metricBarPasted"
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
                className="metricBarDeleted"
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

          {/* DONUT CHARTS */}
          <div className="donutCharts">

            {/* TYPED VS PASTED */}
            <div className="donutChart">
              <div
                className="donut typedPastedDonut"
                style={{
                  "--typed-percentage": `${typedPercentage}%`,
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

                <div>
                  <span className="legendDot pastedTypedRatioDot"></span>
                  Ratio: <b>
                    {metrics.pasteToTypeRatio == null
                      ? "-"
                      : metrics.pasteToTypeRatio.toFixed(2)}
                  </b>
                </div>
              </div>
            </div>

            {/* TYPED VS DELETED */}
            <div className="donutChart">
              <div
                className="donut typedDeletedDonut"
                style={{
                  "--typed-deleted-percentage": `${typedDeletedPercentage}%`,
                }}
              >
                <div className="donutCenter">
                  {deletedToTypedRatio == null
                    ? "-"
                    : deletedToTypedRatio.toFixed(2)}
                </div>
              </div>

              <div className="donutLegend">
                <div>
                  <span className="legendDot typedDot"></span>
                  Typed: <b>{metrics.typedCharCount}</b>
                </div>

                <div>
                  <span className="legendDot deletedDot"></span>
                  Deleted: <b>{metrics.deletedCharCount}</b>
                </div>

                <div>
                  <span className="legendDot typedDeletedRatioDot"></span>
                  Ratio: <b>
                    {deletedToTypedRatio == null
                      ? "-"
                      : deletedToTypedRatio.toFixed(2)}
                  </b>
                </div>
              </div>
            </div>

          </div>

          <h4>Editing Behaviour</h4>

          <div className="metricRow">
            <span>Delete Events</span>

            <div className="metricBarContainer">
              <div
                className="metricBarDeleted"
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

          {/* PAUSES DONUT */}

          <div className="pauseDonutChart">
            <div
              className="donut pauseDonut"
              style={{
                "--short-pause-percentage": `${shortPausePercentage}%`,
                "--short-long-pause-percentage": `${shortPausePercentage + longPausePercentage}%`,
              }}
            >
              <div className="donutCenter">
                {totalPauseCount}
              </div>
            </div>

            <div className="donutLegend">
              <div>
                <span className="legendDot shortPauseDot"></span>
                Short Pauses: <b>{metrics.shortPauseCount ?? 0}</b>
              </div>

              <div>
                <span className="legendDot longPauseDot"></span>
                Long Pauses: <b>{metrics.longPauseCount ?? 0}</b>
              </div>

              <div>
                <span className="legendDot veryLongPauseDot"></span>
                Very Long Pauses: <b>{metrics.veryLongPauseCount ?? 0}</b>
              </div>
            </div>
          </div>

          {sessionBreakCount > 0 && (
            <>
              <div className="metricRow sessionBreakRow">
                <span>Breaks (10min+)</span>

                <span className="sessionBreakDetail">
                  <b>{sessionBreakCount} break
                    {sessionBreakCount === 1 ? "" : "s"}
                  </b>
                  <span>, totalling </span>
                  <b>{formatWritingDuration(sessionBreakTotalMs)}</b>
                </span>
              </div>

              <div className="metricRow sessionBreakRow">
                <span>Active writing time</span>

                <b>
                  {formatWritingDuration(metrics.activeWritingTimeMs)}
                </b>
              </div>

              <div className="metricRow sessionBreakRow">
                <span>First-to-last edit span</span>

                <b>
                  {formatWritingDuration(metrics.totalWritingTimeMs)}
                </b>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}