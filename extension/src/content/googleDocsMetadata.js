console.log("Google Docs analyzer loaded");

function getDocumentId() {
  const match = window.location.pathname.match(/\/document\/d\/([^/]+)/);

  return match ? match[1] : null;
}

function getDocumentInfo() {
  return {
    id: getDocumentId(),
    title: document.title.replace("- Google Docs", "").trim(),
    url: window.location.href,
  };
}

function getModelChunk() {
  const scripts = Array.from(document.scripts).map(
    (script) => script.textContent,
  );

  const modelScript = scripts.find((script) =>
    script.includes("DOCS_modelChunk ="),
  );

  if (!modelScript) {
    return {
      found: false,
    };
  }

  const start = modelScript.indexOf("DOCS_modelChunk =");
  const jsonStart = modelScript.indexOf("{", start);
  const jsonEnd = modelScript.indexOf("};", jsonStart);
  const jsonText = modelScript.substring(jsonStart, jsonEnd + 1);

  try {
    const parsed = JSON.parse(jsonText);

    return {
      found: true,

      model: parsed,
    };
  } catch (error) {
    console.error("Model parse failed", error);

    return {
      found: false,

      error: error.message,
    };
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message:", request);

  if (request.type === "GET_DOC_INFO") {
    sendResponse(getDocumentInfo());

    return true;
  }

  if (request.type === "GET_MODEL_CHUNK") {
    sendResponse(getModelChunk());

    return true;
  }

  return true;
});
