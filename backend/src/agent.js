import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-2.5-flash";

let client = null;

function getClient() {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  return client;
}

const VERDICT_LABELS = {
  likely_human: "likely human-written",
  mixed_signals: "showing mixed signals",
  likely_rewritten: "pasted in bulk, then substantially hand-edited",
  likely_assisted: "likely assisted / not fully original",
  insufficient_evidence: "insufficient behavioural evidence",
};

function selectRelevantSignals(signals, verdict) {
  if (!Array.isArray(signals) || signals.length === 0) {
    return [];
  }

  const priority = {
    likely_human: [
      "pattern_strong_typing",
      "revision_frequent",
      "variable_composition_cadence",
      "pauses_multiple",
      "paste_share_low",
      "incremental_typing",
      "continuous_composition",
    ],

    likely_assisted: [
      "repeated_external_consultation",
      "external_to_document_transitions",
      "post_external_typing",
      "consultation_followed_by_writing",
      "pattern_bulk_paste_minimal_editing",
      "pattern_untouched_bulk_paste",
      "rapid_low_revision",
      "confident_composition",
      "composition_anomaly_combined",
      "burst_typing",
    ],

    likely_rewritten: [
      "pattern_bulk_paste_rewritten",
      "post_paste_editing_substantial",
      "bulk_paste_high",
      "bulk_paste_extreme",
    ],

    mixed_signals: [
      "rapid_low_revision",
      "confident_composition",
      "composition_anomaly_combined",
      "burst_typing",
      "revision_frequent",
      "variable_composition_cadence",
      "post_paste_editing_substantial",
      "post_paste_editing_minimal",
      "paste_share_low",
      "bulk_paste_high",
      "external_to_document_transitions",
    ],

    insufficient_evidence: [
      "revision_limited",
      "pauses_single",
      "paste_share_low",
      "incremental_typing",
    ],
  };

  const preferred = priority[verdict] ?? [];

  const selected = [];

  for (const id of preferred) {
    const match = signals.find((signal) => signal?.id === id);

    if (match && !selected.some((item) => item.id === match.id)) {
      selected.push(match);
    }

    if (selected.length >= 3) {
      break;
    }
  }

  if (selected.length < 2) {
    for (const signal of signals) {
      if (
        signal &&
        !selected.some((item) => item.id === signal.id)
      ) {
        selected.push(signal);
      }

      if (selected.length >= 3) {
        break;
      }
    }
  }

  return selected;
}

function buildHumanReadableSignals(signals) {
  return signals
    .map((signal) => {
      if (!signal?.id || !signal?.text) {
        return null;
      }

      return `[${signal.id}] ${signal.text}`;
    })
    .filter(Boolean)
    .join("\n");
}

function buildMetricBlock(metrics) {
  if (!metrics || typeof metrics !== "object") {
    return "No additional metrics were supplied.";
  }

  return Object.entries(metrics)
    .map(([key, value]) => {
      if (value === undefined || value === null) {
        return null;
      }

      if (typeof value === "object") {
        return `${key}: ${JSON.stringify(value)}`;
      }

      return `${key}: ${value}`;
    })
    .filter(Boolean)
    .join("\n");
}

export async function explainAnalysis(analysis) {
  const {
    verdict,
    score,
    confidence,
    reasons = [],
    signals = [],
    metrics = {},
    independentProcessScore,
    assistanceScore,
  } = analysis;

  const verdictLabel = VERDICT_LABELS[verdict] ?? verdict;

  const selectedSignals = selectRelevantSignals(
    signals,
    verdict,
  );

  const signalBlock = buildHumanReadableSignals(
    selectedSignals,
  );

  const metricBlock = buildMetricBlock(metrics);

  const prompt = `
You are generating the final explanation shown to a teacher in a writing-process analysis dashboard.

A deterministic rule-based engine has already produced the classification. Your task is ONLY to explain that result naturally and concisely.

You MUST preserve the supplied verdict.

You MUST NOT recalculate the verdict.

You MUST NOT introduce new behavioural evidence.

You MUST NOT claim to know who authored the text.

You MUST NOT claim that the student used AI unless the supplied behavioural evidence explicitly identifies external AI usage, which this system normally does not do.

The result describes writing-process behaviour, not authorship certainty.

ANALYSIS

Verdict: ${verdictLabel}
Raw verdict: ${verdict}
Score: ${Math.round(score * 100)}/100
Confidence: ${Math.round(confidence * 100)}%

Independent process score: ${
    independentProcessScore !== undefined
      ? Math.round(independentProcessScore * 100)
      : "not supplied"
  }%

Assistance score: ${
    assistanceScore !== undefined
      ? Math.round(assistanceScore * 100)
      : "not supplied"
  }%

AVAILABLE METRICS

${metricBlock}

SELECTED BEHAVIOURAL SIGNALS

${signalBlock || "No specific behavioural signals were recorded."}

WRITING STYLE

Write a natural teacher-facing explanation.

The explanation should sound like a human analyst interpreting the writing process rather than a machine reading out statistics.

Do NOT simply repeat the supplied signals.

Do NOT list every metric.

Do NOT mention every percentage.

Do NOT start sentences with phrases such as:

"Only 0%..."
"100% of..."
"X% of inserted content..."
"The session shows..."
"The analysis detected..."

unless that exact statistic is genuinely important to understanding the result.

Instead, translate numerical information into natural behavioural language.

For example:

Instead of:
"Only 0% of inserted content came from paste operations."

Write:
"No substantial copy-paste activity was detected during the recorded writing process."

Instead of:
"100% of inserted content was entered through typing."

Write:
"The document was composed primarily through direct incremental input."

Instead of:
"13 edit events were observed."

Write:
"The writer made several revisions while developing the document."

Instead of:
"2 extended pauses were recorded."

Write:
"The writing process included several noticeable pauses between periods of activity."

Instead of:
"A run of 9 consecutive inserts arrived faster than 400ms apart."

Write:
"The timeline also contains a short period of unusually rapid input."

The explanation should combine multiple behavioural factors instead of focusing on one metric.

For example, a strong explanation may connect:

- direct incremental composition
- revision behaviour
- pauses
- typing cadence
- paste activity

rather than repeating typing percentage and paste percentage separately.

IMPORTANT:

Typing is evidence about the interaction process, not proof of authorship.

Do not repeatedly add disclaimers such as:
"typing does not establish independent authorship"

after every typing-related observation.

One appropriately cautious statement is enough when needed.

VERDICT-SPECIFIC GUIDANCE

If the verdict is "likely_human":

Describe the recorded process as being consistent with incremental composition.

Prefer factors such as:
- direct incremental writing
- absence of substantial paste activity
- meaningful revision
- natural pauses
- variation in writing rhythm

The explanation should make clear that the process is consistent with ordinary incremental composition, without claiming certainty about authorship.

If the verdict is "likely_assisted":

Emphasise the strongest combination of behavioural indicators.

Possible factors include:
- substantial pasted material
- minimal modification of pasted material
- rapid low-revision composition
- repeated external consultation
- transitions from external applications back to the document
- writing activity following external consultation

Only mention factors actually supported by the supplied evidence.

Do not claim that external activity produced the document text.

If the verdict is "likely_rewritten":

Focus on the relationship between bulk-pasted material and subsequent editing.

Explain that substantial material entered the document through pasting and was later meaningfully modified.

Make clear that this is different from both untouched pasted content and ordinary incremental composition.

Do not imply misconduct.

If the verdict is "mixed_signals":

Explain the strongest conflicting behavioural indicators.

For example, the process may contain substantial incremental writing while also showing unusually rapid or low-revision composition.

Do not make the explanation sound like a failure of the system.

Instead say that the recorded process contains a combination of patterns that does not strongly support one interpretation.

Recommend reviewing the writing playback and timeline.

If the verdict is "insufficient_evidence":

Explain that the recorded activity was too limited to support a reliable behavioural assessment.

Recommend collecting more writing-process data or reviewing the available playback.

CONFIDENCE

If confidence is below 40%, explicitly describe confidence as low.

If confidence is between 40% and 65%, describe confidence as moderate.

If confidence is above 65%, describe confidence as relatively strong.

Do not make confidence sound like statistical certainty.

EXTERNAL ACTIVITY

If external application activity is present, call it only:

"external application activity"

or

"external consultation activity"

Do not identify the application unless the supplied evidence explicitly provides its identity.

Do not claim causation between external activity and document content.

OUTPUT

Write exactly ONE paragraph.

Write 4-6 sentences.

The first sentence should state the verdict naturally.

The next sentences should explain the two or three strongest behavioural factors supporting that verdict.

The final sentence should provide an appropriate interpretation or recommendation when necessary.

Do not use bullet points.

Do not use markdown.

Do not use headings.

Do not repeat the same behavioural factor twice.

Do not simply convert percentages into sentences.

Do not mention internal variable names, signal IDs, scores, thresholds, or the rule-based engine.

Do not use the words:
"cheating"
"plagiarism"
"AI-generated"

as accusations.

Return plain text only.

The supplied verdict is authoritative and MUST remain unchanged.
`;

  const ai = getClient();

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  const text = response.text?.trim();

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return text;
}