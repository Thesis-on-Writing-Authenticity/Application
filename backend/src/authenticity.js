const VERDICTS = {
  HUMAN: "likely_human",
  MIXED: "mixed_signals",
  REWRITTEN: "likely_rewritten",
  ASSISTED: "likely_assisted",
  INSUFFICIENT: "insufficient_evidence",
};

const THRESHOLDS = {
  pasteShareHigh: 0.75,
  pasteShareExtreme: 0.9,
  pasteShareLow: 0.15,

  strongTypedShare: 0.7,
  humanTypedShare: 0.8,

  minEditsForRevisionSignal: 3,
  revisionRatioStrong: 0.12,
  deletedCharShareStrong: 0.05,

  minLongPausesForSignal: 2,

  burstThresholdMs: 400,
  burstRunMin: 10,

  postPasteEditRatioTiny: 0.05,
  postPasteEditRatioSubstantial: 0.2,

  minExternalConsultations: 2,
  minPostConsultationChars: 150,

  assistedScore: 0.7,

  strongConfidence: 0.6,
  moderateConfidence: 0.3,

  maximumHumanScoreWithoutExternalData: 0.85,

  minimumBulkPasteChars: 100,
  minimumMeaningfulDocumentChars: 100,

  rapidLowRevisionMaxRatio: 0.05,
  rapidLowRevisionMinChars: 400,

  confidentCompositionMaxRevisionRatio: 0.03,
  confidentCompositionMinChars: 500,

  continuousCompositionMinChars: 800,
  continuousCompositionMaxRevisionRatio: 0.07,
  continuousCompositionMaxPauseShare: 0.02,

  compositionAnomalyThreshold: 0.3,
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

    externalConsultations = [],
    postExternalTypingChars = 0,
    externalToDocumentTransitions = 0,
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

  let independentProcessScore = 0.5;
  let assistanceScore = 0;
  let compositionAnomalyScore = 0;

  const pasteShare =
    totalInsertedChars > 0 ? pastedCharCount / totalInsertedChars : 0;

  const typedShare =
    totalInsertedChars > 0 ? typedCharCount / totalInsertedChars : 0;

  const hasMeaningfulPaste =
    pastedCharCount >= THRESHOLDS.minimumBulkPasteChars;

  const revisionRatio = insertCount > 0 ? editEventCount / insertCount : 0;

  const deletedShare =
    totalInsertedChars > 0 ? deletedCharCount / totalInsertedChars : 0;

  const totalLongishPauses = longPauseCount + veryLongPauseCount;

  if (pasteShare >= THRESHOLDS.pasteShareExtreme) {
    assistanceScore += 0.45;

    pushSignal(
      signals,
      reasons,
      "bulk_paste_extreme",
      `${pct(
        pasteShare,
      )} of inserted content entered through paste operations, indicating that a substantial amount of pre-existing content entered the document directly.`,
    );
  } else if (pasteShare >= THRESHOLDS.pasteShareHigh) {
    assistanceScore += 0.3;

    pushSignal(
      signals,
      reasons,
      "bulk_paste_high",
      `A large proportion of inserted content was introduced through paste operations (${pct(
        pasteShare,
      )}).`,
    );
  } else if (pasteShare <= THRESHOLDS.pasteShareLow) {
    pushSignal(
      signals,
      reasons,
      "paste_share_low",
      `Only ${pct(
        pasteShare,
      )} of inserted content came from paste operations. Most content was entered incrementally, but this does not establish independent authorship.`,
    );
  } else {
    pushSignal(
      signals,
      reasons,
      "paste_share_mixed",
      `The session contained a mixture of typed and pasted content (${pct(
        pasteShare,
      )} pasted).`,
    );
  }

  if (typedShare >= THRESHOLDS.humanTypedShare) {
    pushSignal(
      signals,
      reasons,
      "incremental_typing",
      `${pct(
        typedShare,
      )} of inserted content was entered through typing. This indicates incremental composition, but typing alone cannot establish that the underlying content was independently authored.`,
    );
  } else if (typedShare >= THRESHOLDS.strongTypedShare) {
    pushSignal(
      signals,
      reasons,
      "incremental_typing_majority",
      `Most inserted content was entered through typing (${pct(typedShare)}).`,
    );
  } else if (hasMeaningfulPaste && pasteShare >= THRESHOLDS.pasteShareHigh) {
    pushSignal(
      signals,
      reasons,
      "incremental_typing_not_dominant",
      `Only ${pct(
        typedShare,
      )} of inserted content was typed directly; a substantial portion entered through paste operations.`,
    );
  }

  const cadence = calculateTypingCadence(insertTimestamps);

  const burst = detectBurstTyping(
    insertTimestamps,
    THRESHOLDS.burstThresholdMs,
    THRESHOLDS.burstRunMin,
  );

  if (cadence) {
    if (cadence.shortGapShare >= 0.8 && cadence.coefficientOfVariation < 0.35) {
      assistanceScore += 0.08;
      compositionAnomalyScore += 0.08;

      pushSignal(
        signals,
        reasons,
        "regular_rapid_cadence",
        "The recorded insertion timing contains a highly regular rapid-typing pattern. This is treated as a weak behavioural indicator and is not considered proof of external assistance.",
      );
    }

    if (
      cadence.longPauseShare >= 0.05 &&
      cadence.coefficientOfVariation >= 0.5
    ) {
      independentProcessScore += 0.04;

      pushSignal(
        signals,
        reasons,
        "variable_composition_cadence",
        "Typing cadence varied substantially during the session, including pauses and changes in writing rhythm.",
      );
    }
  }

  if (burst.found) {
    assistanceScore += 0.05;
    compositionAnomalyScore += 0.05;

    pushSignal(
      signals,
      reasons,
      "burst_typing",
      `A run of ${burst.longestRun} consecutive inserts arrived faster than ${THRESHOLDS.burstThresholdMs}ms apart, producing a rapid editing pattern.`,
    );
  }

  if (
    burst.found &&
    typedShare >= THRESHOLDS.humanTypedShare &&
    revisionRatio <= THRESHOLDS.rapidLowRevisionMaxRatio &&
    typedCharCount >= THRESHOLDS.rapidLowRevisionMinChars
  ) {
    assistanceScore += 0.14;
    compositionAnomalyScore += 0.14;

    pushSignal(
      signals,
      reasons,
      "rapid_low_revision",
      `A substantial amount of content was entered through typing while the session also showed rapid insertion bursts and very little subsequent revision (${pct(
        revisionRatio,
      )} revision ratio). This combination indicates unusually confident composition behaviour and should be reviewed in the writing playback.`,
    );
  }

  if (
    typedShare >= THRESHOLDS.humanTypedShare &&
    revisionRatio <= THRESHOLDS.confidentCompositionMaxRevisionRatio &&
    typedCharCount >= THRESHOLDS.confidentCompositionMinChars &&
    totalLongishPauses <= 1
  ) {
    assistanceScore += 0.1;
    compositionAnomalyScore += 0.1;

    pushSignal(
      signals,
      reasons,
      "confident_composition",
      `Most content was typed directly with very little correction activity (${pct(
        revisionRatio,
      )} revision ratio) and few extended pauses. The recorded process therefore shows a highly confident composition pattern, which does not by itself establish independent authorship.`,
    );
  }

  if (
    typedShare >= 0.8 &&
    typedCharCount >= THRESHOLDS.continuousCompositionMinChars &&
    revisionRatio <= THRESHOLDS.continuousCompositionMaxRevisionRatio &&
    (!cadence ||
      cadence.longPauseShare <= THRESHOLDS.continuousCompositionMaxPauseShare)
  ) {
    assistanceScore += 0.08;
    compositionAnomalyScore += 0.08;

    pushSignal(
      signals,
      reasons,
      "continuous_composition",
      `A large amount of content was entered continuously through typing with relatively few revisions or interruptions. This represents a low-correction composition pattern and should be interpreted together with the document playback.`,
    );
  }

  if (compositionAnomalyScore >= THRESHOLDS.compositionAnomalyThreshold) {
    pushSignal(
      signals,
      reasons,
      "composition_anomaly_combined",
      "Multiple behavioural indicators point to an unusually confident and low-correction composition process. These signals do not identify the source of the text, but they reduce the strength of a purely behavioural human-authorship interpretation.",
    );
  }

  if (
    editEventCount >= THRESHOLDS.minEditsForRevisionSignal &&
    revisionRatio >= THRESHOLDS.revisionRatioStrong
  ) {
    independentProcessScore += 0.08;

    pushSignal(
      signals,
      reasons,
      "revision_frequent",
      `Revision activity was observed across the session (${editEventCount} edit events), showing that previously inserted content was subsequently changed.`,
    );
  } else if (deletedShare >= THRESHOLDS.deletedCharShareStrong) {
    independentProcessScore += 0.06;

    pushSignal(
      signals,
      reasons,
      "revision_char_share",
      `A noticeable amount of previously inserted content was removed or revised (${deletedCharCount} characters).`,
    );
  } else if (insertCount >= 10 && editEventCount === 0) {
    assistanceScore += 0.03;

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

  if (totalLongishPauses >= THRESHOLDS.minLongPausesForSignal) {
    independentProcessScore += 0.04;

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
        `${pct(
          postPasteEditRatio,
        )} of the pasted content was subsequently modified or replaced (${editedCharsAfterPaste} characters across ${editsAfterPaste} edits touching pasted material).`,
      );
    } else if (postPasteEditRatio <= THRESHOLDS.postPasteEditRatioTiny) {
      assistanceScore += 0.1;

      pushSignal(
        signals,
        reasons,
        "post_paste_editing_minimal",
        `Only ${pct(
          postPasteEditRatio,
        )} of the pasted content was subsequently modified, meaning that most pasted material remained unchanged after insertion.`,
      );
    } else {
      pushSignal(
        signals,
        reasons,
        "post_paste_editing_moderate",
        `${pct(
          postPasteEditRatio,
        )} of the pasted content was subsequently modified.`,
      );
    }
  }

  const mostlyPasted = pasteShare >= THRESHOLDS.pasteShareExtreme;

  const minimalPostPasteEditing =
    pastedCharCount > 0 &&
    postPasteEditRatio <= THRESHOLDS.postPasteEditRatioTiny;

  const substantialPostPasteEditing =
    pastedCharCount > 0 &&
    postPasteEditRatio >= THRESHOLDS.postPasteEditRatioSubstantial;

  const minimalEditBulkPastePattern = mostlyPasted && minimalPostPasteEditing;

  const untouchedBulkPastePattern =
    mostlyPasted &&
    minimalPostPasteEditing &&
    editedCharsAfterPaste === 0 &&
    editsAfterPaste === 0;

  if (minimalEditBulkPastePattern) {
    assistanceScore += 0.15;

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
    assistanceScore += 0.1;

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
    pushSignal(
      signals,
      reasons,
      "pattern_strong_typing",
      `The session shows a predominantly incremental-writing pattern: ${pct(
        typedShare,
      )} of inserted content was typed directly and only ${pct(
        pasteShare,
      )} originated from paste operations. This indicates an incremental process but does not establish independent authorship.`,
    );
  }

  const externalCount = Array.isArray(externalConsultations)
    ? externalConsultations.length
    : 0;

  if (externalCount >= THRESHOLDS.minExternalConsultations) {
    assistanceScore += 0.2;

    pushSignal(
      signals,
      reasons,
      "repeated_external_consultation",
      `${externalCount} external application consultation periods were observed during the writing session.`,
    );
  }

  if (externalToDocumentTransitions >= THRESHOLDS.minExternalConsultations) {
    assistanceScore += 0.15;

    pushSignal(
      signals,
      reasons,
      "external_to_document_transitions",
      `${externalToDocumentTransitions} transitions from external applications back to the document were observed.`,
    );
  }

  if (postExternalTypingChars >= THRESHOLDS.minPostConsultationChars) {
    assistanceScore += 0.15;

    pushSignal(
      signals,
      reasons,
      "post_external_typing",
      `${postExternalTypingChars} characters were entered after periods of external application activity.`,
    );
  }

  if (
    Array.isArray(externalConsultations) &&
    externalConsultations.length > 0
  ) {
    let consultationsFollowedByTyping = 0;
    let consultationTypingChars = 0;

    for (const consultation of externalConsultations) {
      if (
        consultation &&
        Number.isFinite(consultation.followedByTypingChars) &&
        consultation.followedByTypingChars > 0
      ) {
        consultationsFollowedByTyping += 1;
        consultationTypingChars += consultation.followedByTypingChars;
      }
    }

    if (consultationsFollowedByTyping >= 2) {
      assistanceScore += 0.15;

      pushSignal(
        signals,
        reasons,
        "consultation_followed_by_writing",
        `${consultationsFollowedByTyping} external consultation periods were followed by additional document writing (${consultationTypingChars} characters in total).`,
      );
    }
  }

  independentProcessScore = clamp(independentProcessScore, 0, 1);

  assistanceScore = clamp(assistanceScore, 0, 1);

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

  if (compositionAnomalyScore >= 0.2) {
    evidenceAmount += 0.1;
  }

  if (
    pasteShare >= THRESHOLDS.pasteShareExtreme &&
    pastedCharCount >= THRESHOLDS.minimumBulkPasteChars
  ) {
    evidenceAmount += 0.15;
  }

  if (externalCount >= 2) {
    evidenceAmount += 0.15;
  }

  const confidence = clamp(evidenceAmount, 0, 1);

  let score = independentProcessScore - assistanceScore * 0.75;

  score = clamp(score, 0, 1);

  const hasExternalTelemetry =
    externalCount > 0 ||
    externalToDocumentTransitions > 0 ||
    postExternalTypingChars > 0;

  if (!hasExternalTelemetry) {
    score = Math.min(score, THRESHOLDS.maximumHumanScoreWithoutExternalData);
  }

  const normalIncrementalWriting =
    typedShare >= 0.8 &&
    pasteShare <= 0.15 &&
    typedCharCount >= 300 &&
    assistanceScore < 0.3 &&
    compositionAnomalyScore < 0.3 &&
    confidence >= THRESHOLDS.moderateConfidence;

  let verdict;

  if (confidence < THRESHOLDS.moderateConfidence) {
    verdict = VERDICTS.INSUFFICIENT;
  } else if (
    assistanceScore >= THRESHOLDS.assistedScore &&
    confidence >= THRESHOLDS.strongConfidence
  ) {
    verdict = VERDICTS.ASSISTED;
  } else if (
    mostlyPasted &&
    pastedCharCount >= THRESHOLDS.minimumBulkPasteChars
  ) {
    verdict = VERDICTS.REWRITTEN;
  } else if (
    compositionAnomalyScore >= 0.3 &&
    assistanceScore >= 0.35 &&
    confidence >= THRESHOLDS.strongConfidence
  ) {
    verdict = VERDICTS.ASSISTED;
  } else if (normalIncrementalWriting) {
    verdict = VERDICTS.HUMAN;
  } else if (
    strongTypingPattern &&
    independentProcessScore >= 0.6 &&
    assistanceScore < 0.35 &&
    compositionAnomalyScore < 0.3 &&
    confidence >= THRESHOLDS.strongConfidence
  ) {
    verdict = VERDICTS.HUMAN;
  } else {
    verdict = VERDICTS.MIXED;
  }

  return {
    verdict,

    score: round(score, 2),

    confidence: round(confidence, 2),

    independentProcessScore: round(independentProcessScore, 2),

    assistanceScore: round(assistanceScore, 2),

    metrics: {
      totalInsertedChars,

      typedCharCount,

      pastedCharCount,

      deletedCharCount,

      typedShare: round(typedShare, 3),

      pasteShare: round(pasteShare, 3),

      revisionRatio: round(revisionRatio, 3),

      deletedShare: round(deletedShare, 3),

      postPasteEditRatio: round(postPasteEditRatio, 3),

      compositionAnomalyScore: round(compositionAnomalyScore, 3),

      externalConsultations: externalCount,

      postExternalTypingChars,

      externalToDocumentTransitions,

      cadence,
    },

    reasons,
    signals,
  };
}

function calculateTypingCadence(timestamps) {
  if (!Array.isArray(timestamps) || timestamps.length < 2) {
    return null;
  }

  const gaps = [];

  for (let i = 1; i < timestamps.length; i++) {
    const gap = timestamps[i] - timestamps[i - 1];

    if (Number.isFinite(gap) && gap >= 0) {
      gaps.push(gap);
    }
  }

  if (gaps.length === 0) {
    return null;
  }

  const mean = gaps.reduce((sum, value) => sum + value, 0) / gaps.length;

  const variance =
    gaps.reduce((sum, value) => sum + (value - mean) ** 2, 0) / gaps.length;

  const standardDeviation = Math.sqrt(variance);

  return {
    meanGapMs: round(mean, 1),

    standardDeviationMs: round(standardDeviation, 1),

    coefficientOfVariation: round(mean > 0 ? standardDeviation / mean : 0, 3),

    medianGapMs: round(median(gaps), 1),

    shortGapShare: round(
      gaps.filter((gap) => gap < 300).length / gaps.length,
      3,
    ),

    longPauseShare: round(
      gaps.filter((gap) => gap > 3000).length / gaps.length,
      3,
    ),
  };
}

function median(values) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);

  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
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
    verdict: VERDICTS.INSUFFICIENT,
    score: 0.5,
    confidence: 0,
    independentProcessScore: 0.5,
    assistanceScore: 0,
    metrics: {},
    reasons: [reason],
    signals: [],
  };
}

export { VERDICTS, THRESHOLDS };
