const VERDICTS = {
  HUMAN: "likely_human",
  MIXED: "mixed_signals",
  ASSISTED: "likely_assisted",
};

const THRESHOLDS = {
  pasteShareHigh: 0.75,
  pasteShareLow: 0.15,
  minInsertsForRhythm: 10,
  meanInsertLengthHuman: 6,
  meanInsertLengthLarge: 30,
  minEditsForRevisionSignal: 3,
  revisionRatioStrong: 0.15,
  revisionRatioWeak: 0.03,
  deletedCharShareStrong: 0.05,
  minLongPausesForSignal: 2,
  humanScore: 0.65,
  assistedScore: 0.35,
  strongConfidence: 0.65,
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
    return {
      verdict: VERDICTS.MIXED,
      score: 0.5,
      confidence: 0,
      reasons: [
        "No behavioural metrics were available for analysis.",
      ],
    };
  }

  const {
    typedCharCount = 0,
    pastedCharCount = 0,
    deletedCharCount = 0,
    insertCount = 0,
    meanInsertLength = 0,
    editEventCount = 0,
    longPauseCount = 0,
  } = metrics;

  const totalInsertedChars =
    typedCharCount + pastedCharCount;

  if (totalInsertedChars === 0) {
    return {
      verdict: VERDICTS.MIXED,
      score: 0.5,
      confidence: 0,
      reasons: [
        "No writing activity was recorded for this session.",
      ],
    };
  }

  const reasons = [];

  let evidence = 0;

  const pasteShare =
    pastedCharCount / totalInsertedChars;

  if (pasteShare >= THRESHOLDS.pasteShareHigh) {
    evidence -= 0.20;

    reasons.push(
      `A large proportion of inserted content was pasted (${Math.round(
        pasteShare * 100
      )}%).`
    );
  } else if (pasteShare <= THRESHOLDS.pasteShareLow) {
    evidence += 0.10;

    reasons.push(
      "Most inserted content was entered without large paste events."
    );
  } else {
    reasons.push(
      `The session contained a mixture of typed and pasted content (${Math.round(
        pasteShare * 100
      )}% pasted).`
    );
  }

  if (insertCount >= THRESHOLDS.minInsertsForRhythm) {
    if (
      meanInsertLength > 0 &&
      meanInsertLength <= THRESHOLDS.meanInsertLengthHuman
    ) {
      evidence += 0.25;

      reasons.push(
        `Text arrived in small increments (average ${meanInsertLength.toFixed(
          1
        )} characters per insert), consistent with incremental typing.`
      );
    } else if (
      meanInsertLength >= THRESHOLDS.meanInsertLengthLarge
    ) {
      evidence -= 0.20;

      reasons.push(
        `Inserted text was relatively large on average (${meanInsertLength.toFixed(
          1
        )} characters per insert).`
      );
    } else {
      evidence += 0.05;

      reasons.push(
        `Text arrived in moderate-sized increments (average ${meanInsertLength.toFixed(
          1
        )} characters per insert).`
      );
    }
  } else {
    reasons.push(
      `Only ${insertCount} insert actions were recorded, so typing rhythm provides limited evidence.`
    );
  }

  const revisionRatio =
    insertCount > 0
      ? editEventCount / insertCount
      : 0;

  const deletedShare =
    totalInsertedChars > 0
      ? deletedCharCount / totalInsertedChars
      : 0;

  if (
    editEventCount >=
      THRESHOLDS.minEditsForRevisionSignal &&
    revisionRatio >= THRESHOLDS.revisionRatioStrong
  ) {
    evidence += 0.20;

    reasons.push(
      `Frequent revision activity was observed (${editEventCount} deletion events), indicating active editing during the session.`
    );
  } else if (
    deletedShare >=
    THRESHOLDS.deletedCharShareStrong
  ) {
    evidence += 0.15;

    reasons.push(
      `The writer removed and revised a noticeable amount of previously inserted content (${deletedCharCount} characters).`
    );
  } else if (
    insertCount >= THRESHOLDS.minInsertsForRhythm &&
    editEventCount === 0
  ) {
    evidence -= 0.10;

    reasons.push(
      "No deletion activity was observed during the recorded writing process."
    );
  } else {
    reasons.push(
      "Some revision activity was observed, but it provides limited evidence on its own."
    );
  }

  if (
    longPauseCount >=
    THRESHOLDS.minLongPausesForSignal
  ) {
    evidence += 0.05;

    reasons.push(
      `${longPauseCount} extended pause(s) were recorded during the session.`
    );
  } else if (longPauseCount === 1) {
    reasons.push(
      "One extended pause was recorded, providing limited behavioural evidence."
    );
  }

  const mostlyPasted =
    pasteShare >= 0.85;

  const littleTyping =
    typedCharCount <= 50;

  const littleRevision =
    editEventCount <= 1;

  if (
    mostlyPasted &&
    littleTyping &&
    littleRevision
  ) {
    evidence -= 0.30;

    reasons.push(
      "Most content arrived through large paste activity while very little incremental typing or revision was recorded."
    );
  }

  const strongTypingPattern =
    pasteShare <= 0.15 &&
    insertCount >= 30 &&
    meanInsertLength <= 6 &&
    editEventCount >= 3;

  if (strongTypingPattern) {
    evidence += 0.20;

    reasons.push(
      "The session shows a strong incremental-writing pattern with frequent small insertions and subsequent revisions."
    );
  }

  const score = clamp(
    0.5 + evidence,
    0,
    1
  );

  let evidenceAmount = 0;

  if (insertCount >= 10) {
    evidenceAmount += 0.30;
  }

  if (insertCount >= 50) {
    evidenceAmount += 0.20;
  }

  if (editEventCount >= 3) {
    evidenceAmount += 0.15;
  }

  if (typedCharCount > 100) {
    evidenceAmount += 0.15;
  }

  if (pastedCharCount > 100) {
    evidenceAmount += 0.10;
  }

  if (longPauseCount >= 2) {
    evidenceAmount += 0.05;
  }

  if (totalInsertedChars >= 500) {
    evidenceAmount += 0.05;
  }

  const confidence = clamp(
    evidenceAmount,
    0,
    1
  );

  let verdict = VERDICTS.MIXED;

  if (
    confidence >= THRESHOLDS.strongConfidence &&
    score >= THRESHOLDS.humanScore
  ) {
    verdict = VERDICTS.HUMAN;
  } else if (
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
  };
}

export { VERDICTS, THRESHOLDS };