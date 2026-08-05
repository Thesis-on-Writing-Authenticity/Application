export default function Metrics({ metrics, backendStatus }) {
  return (
    <>
      {metrics && (
        <>
          <h3>Behavioural Metrics</h3>

          <p>Typed characters:
            <b> {metrics.typedCharCount}</b>
          </p>

          <p>Deleted characters:
            <b> {metrics.deletedCharCount}</b>
          </p>

          <p>Pasted characters:
            <b> {metrics.pastedCharCount}</b>
          </p>

          <p>Paste / Type ratio:
            <b>
              {" "}
              {metrics.pasteToTypeRatio == null
                ? "-"
                : metrics.pasteToTypeRatio.toFixed(2)}
            </b>
          </p>

          <p>Delete events:
            <b> {metrics.editEventCount}</b>
          </p>

          <p>Long pauses:
            <b> {metrics.longPauseCount}</b>
          </p>

          <p>First to last edit time:
            <b> {(metrics.totalWritingTimeMs / 1000).toFixed(1)} s</b>
          </p>
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