import "./Analysis.css";

export default function Analysis({ analysis }) {
    if (!analysis) {
        return null;
    }

  return (
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
                <h4>Score Factors</h4>

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