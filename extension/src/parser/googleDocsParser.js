export function extractModelChunk() {
  const scripts = Array.from(document.scripts).map(
    (script) => script.textContent,
  );

  const modelScript = scripts.find((script) =>
    script.includes("DOCS_modelChunk ="),
  );

  if (!modelScript) {
    return null;
  }

  const start = modelScript.indexOf("DOCS_modelChunk =");
  const jsonStart = modelScript.indexOf("{", start);
  const jsonEnd = modelScript.indexOf("};", jsonStart);
  const json = modelScript.substring(jsonStart, jsonEnd + 1);

  try {
    return JSON.parse(json);
  } catch (error) {
    console.error("Model parse failed", error);

    return null;
  }
}
