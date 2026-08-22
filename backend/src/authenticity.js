const VERDICTS = {
  HUMAN: "likely_human",
  MIXED: "mixed_signals",
  REWRITTEN: "likely_rewritten",
  ASSISTED: "likely_assisted",
};

const THRESHOLDS = {
  pasteShareHigh: 0.75,
  pasteShareExtreme: 0.9,
  pasteShareLow: 0.15,

  strongTypedShare: 0.7,
  humanTypedShare: 0.8,

  minEditsForRevisionSignal: 3,
  revisionRatioStrong: 0.15,
  deletedCharShareStrong: 0.05,

  minLongPausesForSignal: 2,
  minVeryLongPausesForSignal: 1,

  burstThresholdMs: 400,
  burstRunMin: 8,

  postPasteEditRatioTiny: 0.05,
  postPasteEditRatioSubstantial: 0.2,

  humanScore: 0.65,
  assistedScore: 0.35,

  strongConfidence: 0.65,
  moderateConfidence: 0.4,

  minimumBulkPasteChars: 100,
  minimumMeaningfulDocumentChars: 100,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round(value, decimals = 2) {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

export function scoreAuthenticity(metrics) {
  if (!metrics) {
    return emptyResult("No behavioural metrics were available for analysis.");
  }

  const {
    typedCharCount = 0,
    pastedCharCount = 0,
    deletedCharCount = 0,
    insertCount = 0,

    editEventCount = 0,

    longPauseCount = 0,
    veryLongPauseCount = 0,

    sessionBreakCount = 0,
    sessionBreakTotalMs = 0,

    insertTimestamps = [],

    editedCharsAfterPaste = 0,
    editsAfterPaste = 0,
  } = metrics;

  const totalInsertedChars =
    Math.max(0, typedCharCount) + Math.max(0, pastedCharCount);

  if (totalInsertedChars < THRESHOLDS.minimumMeaningfulDocumentChars) {
    return emptyResult(
      "Too little writing activity was recorded to produce a reliable behavioural analysis.",
    );
  }

  const reasons = [];
  const signals = [];

  let evidence = 0;

  const pasteShare =
    totalInsertedChars > 0 ? pastedCharCount / totalInsertedChars : 0;

  const typedShare =
    totalInsertedChars > 0 ? typedCharCount / totalInsertedChars : 0;

  const hasMeaningfulPaste =
    pastedCharCount >= THRESHOLDS.minimumBulkPasteChars;

  if (pasteShare >= THRESHOLDS.pasteShareExtreme) {
    evidence -= 0.45;

    pushSignal(
      signals,
      reasons,
      "bulk_paste_extreme",
      `${pct(pasteShare)} of inserted content was introduced through paste operations, indicating that most of the document entered the session as pre-existing content rather than through incremental composition.`,
    );
  } else if (pasteShare >= THRESHOLDS.pasteShareHigh) {
    evidence -= 0.3;

    pushSignal(
      signals,
      reasons,
      "bulk_paste_high",
      `A large proportion of inserted content was introduced through paste operations (${pct(pasteShare)}).`,
    );
  } else if (pasteShare <= THRESHOLDS.pasteShareLow) {
    evidence += 0.2;

    pushSignal(
      signals,
      reasons,
      "paste_share_low",
      `Only ${pct(pasteShare)} of inserted content came from paste operations, while most content was entered incrementally.`,
    );
  } else {
    pushSignal(
      signals,
      reasons,
      "paste_share_mixed",
      `The session contained a mixture of typed and pasted content (${pct(pasteShare)} pasted).`,
    );
  }

  if (
    typedShare >= THRESHOLDS.humanTypedShare &&
    pasteShare <= THRESHOLDS.pasteShareLow
  ) {
    evidence += 0.25;

    pushSignal(
      signals,
      reasons,
      "incremental_typing_strong",
      `${pct(typedShare)} of inserted content was entered through typing rather than paste operations, showing a predominantly incremental writing process.`,
    );
  } else if (typedShare >= THRESHOLDS.strongTypedShare && pasteShare < 0.3) {
    evidence += 0.15;

    pushSignal(
      signals,
      reasons,
      "incremental_typing_majority",
      `Most inserted content was entered through typing (${pct(typedShare)}), with relatively limited pasted content.`,
    );
  } else if (hasMeaningfulPaste && pasteShare >= THRESHOLDS.pasteShareHigh) {
    pushSignal(
      signals,
      reasons,
      "incremental_typing_not_dominant",
      `Only ${pct(typedShare)} of inserted content was typed directly; later small edits are not treated as evidence of predominantly incremental composition.`,
    );
  }

  const burst = detectBurstTyping(
    insertTimestamps,
    THRESHOLDS.burstThresholdMs,
    THRESHOLDS.burstRunMin,
  );

  if (burst.found) {
    evidence -= 0.1;

    pushSignal(
      signals,
      reasons,
      "burst_typing",
      `A run of ${burst.longestRun} consecutive inserts arrived faster than ${THRESHOLDS.burstThresholdMs}ms apart, producing an unusually rapid editing pattern.`,
    );
  }

  const revisionRatio = insertCount > 0 ? editEventCount / insertCount : 0;

  const deletedShare =
    totalInsertedChars > 0 ? deletedCharCount / totalInsertedChars : 0;

  if (
    editEventCount >= THRESHOLDS.minEditsForRevisionSignal &&
    revisionRatio >= THRESHOLDS.revisionRatioStrong
  ) {
    evidence += 0.1;

    pushSignal(
      signals,
      reasons,
      "revision_frequent",
      `Revision activity was observed across the session (${editEventCount} deletion events), showing that some previously inserted content was subsequently changed.`,
    );
  } else if (deletedShare >= THRESHOLDS.deletedCharShareStrong) {
    evidence += 0.1;

    pushSignal(
      signals,
      reasons,
      "revision_char_share",
      `A noticeable amount of previously inserted content was removed or revised (${deletedCharCount} characters).`,
    );
  } else if (insertCount >= 10 && editEventCount === 0) {
    evidence -= 0.05;

    pushSignal(
      signals,
      reasons,
      "revision_none",
      "No deletion activity was observed during the recorded writing process.",
    );
  } else if (editEventCount > 0) {
    pushSignal(
      signals,
      reasons,
      "revision_limited",
      `A small amount of revision activity was observed (${editEventCount} edit events).`,
    );
  }
  const totalLongishPauses = longPauseCount + veryLongPauseCount;

  if (totalLongishPauses >= THRESHOLDS.minLongPausesForSignal) {
    evidence += 0.05;

    pushSignal(
      signals,
      reasons,
      "pauses_multiple",
      `${totalLongishPauses} extended pause(s) were recorded during the session, excluding breaks of 10 minutes or more.`,
    );
  } else if (totalLongishPauses === 1) {
    pushSignal(
      signals,
      reasons,
      "pauses_single",
      "One extended pause was recorded, providing limited behavioural evidence.",
    );
  }

  if (sessionBreakCount > 0) {
    pushSignal(
      signals,
      reasons,
      "session_breaks_present",
      `The session included ${sessionBreakCount} break(s) of 10 minutes or longer, totalling ${formatDuration(
        sessionBreakTotalMs,
      )}. These breaks are excluded from the authenticity score.`,
    );
  }

  const postPasteEditRatio =
    pastedCharCount > 0
      ? clamp(editedCharsAfterPaste / pastedCharCount, 0, 1)
      : 0;

  if (pastedCharCount > 0) {
    if (postPasteEditRatio >= THRESHOLDS.postPasteEditRatioSubstantial) {
      pushSignal(
        signals,
        reasons,
        "post_paste_editing_substantial",
        `${pct(postPasteEditRatio)} of the pasted content was subsequently modified or replaced (${editedCharsAfterPaste} characters across ${editsAfterPaste} edits touching pasted material).`,
      );
    } else if (postPasteEditRatio <= THRESHOLDS.postPasteEditRatioTiny) {
      pushSignal(
        signals,
        reasons,
        "post_paste_editing_minimal",
        `Only ${pct(postPasteEditRatio)} of the pasted content was subsequently modified, meaning that the bulk of the pasted material remained unchanged after insertion.`,
      );
    } else {
      pushSignal(
        signals,
        reasons,
        "post_paste_editing_moderate",
        `${pct(postPasteEditRatio)} of the pasted content was subsequently modified.`,
      );
    }
  }

  const mostlyPasted = pasteShare >= THRESHOLDS.pasteShareExtreme;
  const minimalPostPasteEditing = pastedCharCount > 0 && postPasteEditRatio <= THRESHOLDS.postPasteEditRatioTiny;
  const substantialPostPasteEditing = pastedCharCount > 0 && postPasteEditRatio >= THRESHOLDS.postPasteEditRatioSubstantial;
  const minimalEditBulkPastePattern = mostlyPasted && minimalPostPasteEditing;
  const rewrittenPattern = pasteShare >= THRESHOLDS.pasteShareHigh && pastedCharCount >= THRESHOLDS.minimumBulkPasteChars && (postPasteEditRatio > 0 || editedCharsAfterPaste > 0 || editsAfterPaste > 0);

  const untouchedBulkPastePattern =
    mostlyPasted &&
    minimalPostPasteEditing &&
    editedCharsAfterPaste === 0 &&
    editsAfterPaste === 0;

  if (minimalEditBulkPastePattern) {
    evidence -= 0.2;

    pushSignal(
      signals,
      reasons,
      "pattern_bulk_paste_minimal_editing",
      `The document was introduced predominantly through bulk pasting (${pct(
        pasteShare,
      )}), while only ${pct(
        postPasteEditRatio,
      )} of the pasted material was subsequently changed.`,
    );
  }

  if (substantialPostPasteEditing) {
    pushSignal(
      signals,
      reasons,
      "pattern_bulk_paste_rewritten",
      "A large amount of content entered through paste operations and a substantial portion of that pasted material was subsequently edited.",
    );
  }

  if (untouchedBulkPastePattern) {
    evidence -= 0.2;

    pushSignal(
      signals,
      reasons,
      "pattern_untouched_bulk_paste",
      "Most of the document entered through paste operations and no meaningful subsequent modification of the pasted material was detected.",
    );
  }

  const strongTypingPattern =
    typedShare >= THRESHOLDS.humanTypedShare &&
    pasteShare <= THRESHOLDS.pasteShareLow &&
    insertCount >= 20 &&
    editEventCount >= 3;

  if (strongTypingPattern) {
    evidence += 0.2;

    pushSignal(
      signals,
      reasons,
      "pattern_strong_typing",
      `The session shows a predominantly incremental-writing pattern: ${pct(
        typedShare,
      )} of inserted content was typed directly and only ${pct(
        pasteShare,
      )} originated from paste operations.`,
    );
  }

  let score = clamp(0.5 + evidence, 0, 1);

  if (pasteShare >= THRESHOLDS.pasteShareExtreme) {
    if (minimalPostPasteEditing) {
      score = Math.min(score, 0.25);
    } else if (postPasteEditRatio < 0.2) {
      score = Math.min(score, 0.4);
    } else {
      score = Math.min(score, 0.55);
    }
  }

  let evidenceAmount = 0;

  if (insertCount >= 10) {
    evidenceAmount += 0.2;
  }

  if (insertCount >= 50) {
    evidenceAmount += 0.1;
  }

  if (editEventCount >= 3) {
    evidenceAmount += 0.1;
  }

  if (typedCharCount > 100) {
    evidenceAmount += 0.1;
  }

  if (pastedCharCount > 100) {
    evidenceAmount += 0.15;
  }

  if (totalLongishPauses >= 2) {
    evidenceAmount += 0.05;
  }

  if (totalInsertedChars >= 500) {
    evidenceAmount += 0.1;
  }

  if (insertTimestamps.length >= THRESHOLDS.burstRunMin) {
    evidenceAmount += 0.1;
  }

  if (
    pasteShare >= THRESHOLDS.pasteShareExtreme &&
    pastedCharCount >= THRESHOLDS.minimumBulkPasteChars
  ) {
    evidenceAmount += 0.15;
  }

  let confidence = clamp(evidenceAmount, 0, 1);

  if (pasteShare >= 0.95 && pastedCharCount >= 500) {
    confidence = Math.max(confidence, 0.9);
  } else if (pasteShare >= 0.9 && pastedCharCount >= 500) {
    confidence = Math.max(confidence, 0.8);
  } else if (pasteShare >= 0.75 && pastedCharCount >= 500) {
    confidence = Math.max(confidence, 0.7);
  }

  let verdict = VERDICTS.MIXED;

  if (
    mostlyPasted &&
    pastedCharCount >= THRESHOLDS.minimumBulkPasteChars &&
    confidence >= THRESHOLDS.moderateConfidence
  ) {
    if (minimalPostPasteEditing) {
      verdict = VERDICTS.REWRITTEN;
    } else {
      verdict = VERDICTS.REWRITTEN;
    }
  }

  else if (
    pasteShare >= THRESHOLDS.pasteShareHigh &&
    pastedCharCount >= THRESHOLDS.minimumBulkPasteChars &&
    confidence >= THRESHOLDS.moderateConfidence
  ) {
    verdict = VERDICTS.REWRITTEN;
  }

  else if (
    strongTypingPattern &&
    confidence >= THRESHOLDS.strongConfidence &&
    score >= THRESHOLDS.humanScore
  ) {
    verdict = VERDICTS.HUMAN;
  }

  else if (
    confidence >= THRESHOLDS.strongConfidence &&
    score <= THRESHOLDS.assistedScore
  ) {
    verdict = VERDICTS.ASSISTED;
  }

  return {
    verdict,
    score: round(score, 2),
    confidence: round(confidence, 2),
    reasons,
    signals,
  };
}

function pushSignal(signals, reasons, id, text) {
  signals.push({
    id,
    text,
  });

  reasons.push(text);
}

function pct(ratio) {
  if (!Number.isFinite(ratio)) {
    return "0%";
  }

  const percentage = ratio * 100;

  if (percentage === 0) {
    return "0%";
  }

  if (percentage < 1) {
    return `${percentage.toFixed(2)}%`;
  }

  if (Number.isInteger(percentage)) {
    return `${percentage}%`;
  }

  return `${percentage.toFixed(1)}%`;
}

function formatDuration(ms) {
  const totalMinutes = Math.round(ms / 60000);

  const hours = Math.floor(totalMinutes / 60);

  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function emptyResult(reason) {
  return {
    verdict: VERDICTS.MIXED,
    score: 0.5,
    confidence: 0,
    reasons: [reason],
    signals: [],
  };
}

function detectBurstTyping(timestamps, thresholdMs, minRun) {
  if (!Array.isArray(timestamps) || timestamps.length < minRun) {
    return {
      found: false,
      longestRun: 0,
    };
  }

  let longestRun = 1;
  let currentRun = 1;

  for (let i = 1; i < timestamps.length; i++) {
    const gap = timestamps[i] - timestamps[i - 1];

    if (gap >= 0 && gap <= thresholdMs) {
      currentRun += 1;

      longestRun = Math.max(longestRun, currentRun);
    } else {
      currentRun = 1;
    }
  }

  return {
    found: longestRun >= minRun,
    longestRun,
  };
}

export { VERDICTS, THRESHOLDS };
