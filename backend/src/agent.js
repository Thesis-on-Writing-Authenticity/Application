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
};

export async function explainAnalysis(analysis) {
  const {
    verdict,
    score,
    confidence,
    reasons = [],
    signals = [],
  } = analysis;

  const signalBlock = signals.length
    ? signals
        .map((signal) => {
          const id = signal.id ? `[${signal.id}] ` : "";
          return `- ${id}${signal.text}`;
        })
        .join("\n")
    : reasons.map((reason) => `- ${reason}`).join("\n");

  const verdictLabel = VERDICT_LABELS[verdict] ?? verdict;

  const prompt = `
You are writing a short, neutral explanation for a teacher-facing dashboard.

The dashboard has already analysed a Google Docs revision history using a deterministic, rule-based behavioural analysis engine.

IMPORTANT:
You are NOT the classifier.
You are NOT allowed to change, reinterpret, override, or soften the supplied verdict.
You are ONLY explaining the result produced by the analysis engine.

The analysis does NOT determine:
- whether a student used AI
- whether a student committed misconduct
- whether the student cheated
- who actually authored the text
- what tool or source was used

It only describes observable writing-process behaviour.

ANALYSIS RESULT

Verdict: ${verdictLabel}
Raw verdict: ${verdict}
Score: ${Math.round(score * 100)}/100
Confidence: ${Math.round(confidence * 100)}%

UNDERLYING BEHAVIOURAL SIGNALS

${signalBlock || "- No specific behavioural signals were recorded."}

INSTRUCTIONS

Write exactly one paragraph of 4-6 sentences.

1. Start by clearly stating the supplied verdict and confidence level in plain language.

2. Explain the ONE OR TWO most important behavioural signals. Prefer measurable process patterns such as:
   - unusually large bulk-paste events
   - the proportion of content introduced through pasting
   - how much pasted content was subsequently edited
   - long periods of inactivity
   - burst-typing behaviour
   - incremental revision patterns
   - the relationship between pasted material and later editing

3. Do NOT invent metrics, percentages, events, or behaviours that are not present in the supplied signals.

4. Do NOT infer intent or authorship. Describe only observable behaviour.

5. If the verdict is "likely_rewritten", explicitly explain that the observed pattern consists of substantial content entering through a bulk paste followed by meaningful editing. Make clear that this is different from both untouched bulk pasting and incremental typing. Also state that this pattern alone does not establish misconduct because students may legitimately paste and then revise their own drafts, notes, or outlines.

6. If the verdict is "likely_assisted", explain that the document contains a strong bulk-introduction pattern with limited evidence of subsequent incremental editing, if that is supported by the supplied signals.

7. If the verdict is "likely_human", explain the incremental writing/revision behaviour that supports that classification.

8. If the verdict is "mixed_signals", or confidence is below 40%, explicitly state that the behavioural evidence is inconclusive on its own and recommend reviewing the playback/timeline.

9. Never use:
   - "cheating"
   - "plagiarism"
   - "AI-generated"
   as accusations.

10. Do not use bullet points, markdown, headings, or labels.
11. Return plain text only.

The supplied verdict is authoritative. Do not produce a different verdict from the one given above.
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