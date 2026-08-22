export const LONG_PAUSE_MS = 2000;

export function computeMetrics(session, events) {
  let typedCharCount = 0;
  let pastedCharCount = 0;
  let deletedCharCount = 0;

  let editEventCount = 0;
  let insertCount = 0;
  let maxInsertLength = 0;
  let pasteCount = 0;

  // Tracks edits that occur after paste operations.
  let editsAfterPaste = 0;
  let editedCharsAfterPaste = 0;

  let shortPauseCount = 0;
  let longPauseCount = 0;
  let veryLongPauseCount = 0;

  let shortPauseTotalMs = 0;
  let longPauseTotalMs = 0;
  let veryLongPauseTotalMs = 0;

  let sessionBreakCount = 0;
  let sessionBreakTotalMs = 0;

  const sessionBreaks = [];

  /*
   * Keep track of paste operations so that later deletion/replacement
   * operations can be associated with previously pasted content when
   * positional information is available.
   */
  const pasteEvents = [];

  for (const event of events) {
    switch (event.type) {
      case "INSERT": {
        typedCharCount += event.length;
        insertCount += 1;

        if (event.length > maxInsertLength) {
          maxInsertLength = event.length;
        }

        break;
      }

      case "PASTE": {
        pastedCharCount += event.length;
        pasteCount += 1;

        pasteEvents.push({
          length: event.length,
          index:
            event.index ??
            event.position ??
            event.startIndex ??
            null,
          timestamp:
            event.timestamp ??
            event.ts ??
            null,
        });

        break;
      }

      case "DELETE": {
        editEventCount += 1;
        deletedCharCount += event.length;

        /*
         * A deletion after a paste is an edit event, but we only count
         * the deleted characters as pasted-content modifications when
         * the event provides enough positional information to establish
         * that relationship.
         */
        const affectedPaste = findAffectedPaste(
          event,
          pasteEvents
        );

        if (affectedPaste) {
          editsAfterPaste += 1;

          editedCharsAfterPaste += Math.min(
            event.length,
            affectedPaste.remainingLength
          );

          affectedPaste.remainingLength -= Math.min(
            event.length,
            affectedPaste.remainingLength
          );
        }

        break;
      }

      case "PAUSE": {
        if (event.length >= SESSION_BREAK_MS) {
          sessionBreakCount += 1;
          sessionBreakTotalMs += event.length;

          sessionBreaks.push({
            durationMs: event.length,
          });

          break;
        }

        const bucket = classifyPause(event.length);

        if (bucket === "short") {
          shortPauseCount += 1;
          shortPauseTotalMs += event.length;
        } else if (bucket === "long") {
          longPauseCount += 1;
          longPauseTotalMs += event.length;
        } else if (bucket === "very_long") {
          veryLongPauseCount += 1;
          veryLongPauseTotalMs += event.length;
        }

        break;
      }
    }
  }

  const totalWritingTimeMs = durationMs(
    session.started_at,
    session.ended_at
  );

  const activeWritingTimeMs =
    totalWritingTimeMs != null
      ? Math.max(
          0,
          totalWritingTimeMs - sessionBreakTotalMs
        )
      : null;

  return {
    totalWritingTimeMs,
    activeWritingTimeMs,

    typedCharCount,
    pastedCharCount,
    pasteToTypeRatio: typedCharCount > 0 ? pastedCharCount / typedCharCount : null,
    deletedCharCount,
    editEventCount,

    insertCount,
    maxInsertLength,

    meanInsertLength:
      insertCount > 0
        ? typedCharCount / insertCount
        : 0,

    pasteCount,

    /*
     * These are the fields expected by scoreAuthenticity().
     */
    editsAfterPaste,
    editedCharsAfterPaste,

    /*
     * Keep the individual paste events available for the
     * analysis engine if needed later.
     */
    pasteEvents,

    shortPauseCount,
    longPauseCount,
    veryLongPauseCount,

    shortPauseTotalMs,
    longPauseTotalMs,
    veryLongPauseTotalMs,

    totalPauseCount:
      shortPauseCount +
      longPauseCount +
      veryLongPauseCount,

    sessionBreakCount,
    sessionBreakTotalMs,
    sessionBreaks,

    startedAt: session.started_at,
    endedAt: session.ended_at,
  };
}

function findAffectedPaste(event, pasteEvents) {
  const deleteIndex =
    event.index ??
    event.position ??
    event.startIndex ??
    null;

  if (deleteIndex == null) {
    return null;
  }

  for (let i = pasteEvents.length - 1; i >= 0; i--) {
    const paste = pasteEvents[i];

    if (paste.index == null) {
      continue;
    }

    const pasteStart = paste.index;
    const pasteEnd =
      paste.index + paste.remainingLength;

    if (
      deleteIndex >= pasteStart &&
      deleteIndex < pasteEnd &&
      paste.remainingLength > 0
    ) {
      return paste;
    }
  }

  return null;
}

function classifyPause(durationMs) {
  if (durationMs >= VERY_LONG_PAUSE_MS) {
    return "very_long";
  }

  if (durationMs >= LONG_PAUSE_MS) {
    return "long";
  }

  if (durationMs >= SHORT_PAUSE_MS) {
    return "short";
  }

  return null;
}

function durationMs(startedAt, endedAt) {
  if (!startedAt || !endedAt) {
    return null;
  }

  const start = Date.parse(startedAt);
  const end = Date.parse(endedAt);

  if (
    Number.isNaN(start) ||
    Number.isNaN(end)
  ) {
    return null;
  }

  return end - start;
}