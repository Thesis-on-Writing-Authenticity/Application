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
      size: jsonText.length,
      chunkCount: parsed?.chunk?.length || 0,
      sample: parsed?.chunk?.slice(0, 10),
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

function inspectGoogleDocsPage() {
  const html = document.documentElement.innerHTML;

  const keywords = [
    "AF_initData",
    "tileInfo",
    "changelog",
    "revision",
    "revisions",
    "DOCS_modelChunk",
    "serverData",
    "bootstrap",
    "collab",
  ];

  const found = {};

  for (const keyword of keywords) {
    found[keyword] = html.includes(keyword);
  }

  const scripts = Array.from(document.scripts)
    .map((script) => script.textContent)
    .filter((text) => text.length > 100)
    .slice(0, 5);

  return {
    pageLength: html.length,
    found,
    scripts,
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message:", request);

  switch (request.type) {
    case "GET_DOC_INFO":
      sendResponse(getDocumentInfo());
      return true;

    case "GET_MODEL_CHUNK":
      sendResponse(getModelChunk());
      return true;

    case "GET_PAGE_DATA":
      sendResponse(inspectGoogleDocsPage());
      return true;

    default:
      return false;
  }
});