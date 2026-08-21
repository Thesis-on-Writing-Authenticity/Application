import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-2.5-flash";

let client = null;
function getClient() {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

const VERDICT_LABELS = {
  likely_human: "likely human-written",
  mixed_signals: "showing mixed signals",
  likely_assisted: "likely assisted / not fully original",
};

export async function explainAnalysis(analysis) {
  const { verdict, confidence, reasons } = analysis;

  const prompt = `You are writing a short, neutral note for a teacher-facing dashboard that summarises a writing-behaviour analysis. You are NOT deciding anything yourself — just explain the verdict and reasons below in one plain paragraph (3-4 sentences, no bullet points, no markdown).

Verdict: ${VERDICT_LABELS[verdict] ?? verdict}
Confidence: ${Math.round(confidence * 100)}%
Reasons:
${reasons.map((r) => `- ${r}`).join("\n")}

Rules:
- Do not accuse the student of cheating or using AI. Describe behaviour, not intent.
- If the verdict is "mixed signals" or the confidence is low, say the evidence is inconclusive and suggest human review.
- Stay factual and calm, one paragraph, plain text only.`;

  const client = getClient();
  const response = await client.models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }
  return text;
}