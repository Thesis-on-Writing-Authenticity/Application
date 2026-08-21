export const LONG_PAUSE_MS = 2000;

export function computeMetrics(session, events) {
  let typedCharCount = 0;
  let pastedCharCount = 0;
  let deletedCharCount = 0;
  let editEventCount = 0;
  let longPauseCount = 0;
  let insertCount = 0;
  let maxInsertLength = 0;
  let pasteCount = 0;

  for (const event of events) {
    switch (event.type) {
      case "INSERT":
        typedCharCount += event.length;
        insertCount += 1;
        if (event.length > maxInsertLength) {
          maxInsertLength = event.length;
        }
        break;
      case "PASTE":
        pastedCharCount += event.length;
        pasteCount += 1;
        break;
      case "DELETE":
        editEventCount += 1;
        deletedCharCount += event.length;
        break;
      case "PAUSE":
        if (event.length > LONG_PAUSE_MS) {
          longPauseCount += 1;
        }
        break;
    }
  }

  const totalWritingTimeMs = durationMs(session.started_at, session.ended_at);

  return {
    totalWritingTimeMs,
    typedCharCount,
    pastedCharCount,
    pasteToTypeRatio: typedCharCount > 0 ? pastedCharCount / typedCharCount : null,
    deletedCharCount,
    editEventCount,
    longPauseCount,
    insertCount,
    maxInsertLength,
    meanInsertLength: insertCount > 0 ? typedCharCount / insertCount : 0,
    pasteCount,
    startedAt: session.started_at,
    endedAt: session.ended_at,
  };
}

function durationMs(startedAt, endedAt) {
  if (!startedAt || !endedAt) {
    return null;
  }
  const start = Date.parse(startedAt);
  const end = Date.parse(endedAt);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return null;
  }
  return end - start;
}
