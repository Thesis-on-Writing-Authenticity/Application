import { useEffect, useState } from "react";
import { loginGoogle } from "../api/googleAuth";
import {
  getGoogleDocument,
  getGoogleDocsRevisions,
  getGoogleDocsTiles,
} from "../api/googleDocs";
import { getRevisions } from "../api/googleDrive";
import { extractText } from "../parser/googleDocsTextExtractor";
import { parseChangeLog } from "../parser/changelogParser";
import { buildFrames } from "../replay/buildFrames";
import PlaybackViewer from "../components/ReplayPlayer";
import { buildUserStats } from "../replay/statistics";
import StatsBar from "../components/StatsBar";
import SidePanelUI from "./SidePanelUI";
import { saveSession } from "../api/writingEvents";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [googleToken, setGoogleToken] = useState(null);
  const [documentData, setDocumentData] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [wordCount, setWordCount] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [frames, setFrames] = useState([]);
  const [operations, setOperations] = useState([]);
  const [charCount, setCharCount] = useState(0);
  const [backendStatus, setBackendStatus] = useState(null);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    loadDocument();
  }, []);

  async function loadDocument() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      setLoading(false);
      return;
    }

    chrome.tabs.sendMessage(
      tab.id,

      {
        type: "GET_DOC_INFO",
      },

      (response) => {
        if (chrome.runtime.lastError || !response?.id) {
          setDoc(null);
        } else {
          setDoc(response);
        }

        setLoading(false);
      },
    );
  }

  async function getModel() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tab?.id) {
    return null;
  }

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tab.id,
      { type: "GET_MODEL_CHUNK" },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        resolve(response);
      }
    );
  });
}

  async function analyzeDocument() {
  if (!doc?.id) {
    alert("Open a Google Docs document in the active tab, then reopen this panel.");
    return;
  }

  try {
    setAnalyzing(true);
    console.log("=== Starting document analysis ===");
    console.log("Document ID:", doc.id);

    console.log("Fetching model...");
    const modelData = await getModel();
    console.log("Model data:", modelData);

    const latestRevision = modelData?.model?.revision;
    console.log("Latest revision:", latestRevision);

    console.log("Logging into Google...");
    const token = await loginGoogle();
    console.log("Google token acquired:", token ? "YES" : "NO");

    setGoogleToken(token);

    console.log("Fetching Google Docs tiles...");
    const tilesData = await getGoogleDocsTiles(doc.id, token);
    console.log("Tiles data:", tilesData);

    console.log("Fetching Google Document...");
    const document = await getGoogleDocument(doc.id, token);
    console.log("Document:", document);

    setDocumentData(document);

    const text = extractText(document);
    console.log("Extracted text:", text);

    const words = text.trim().split(/\s+/).filter(Boolean).length;
    console.log("Word count:", words);

    setWordCount(words);
    setCharCount(text.length);

    console.log("Fetching Drive revisions...");
    const driveRevisions = await getRevisions(doc.id, token);
    console.log("Drive revisions:", driveRevisions);

    setRevisions(driveRevisions);

    console.log("Fetching Docs revision changelog...");
    const docsRevisions = await getGoogleDocsRevisions(doc.id, 1, latestRevision, token);
    console.log("Raw Docs revisions:", docsRevisions);

    const cleaned = docsRevisions.replace(")]}'", "").trim();
    console.log("Cleaned JSON:", cleaned);

    const revisionData = JSON.parse(cleaned);
    console.log("Parsed revision data:", revisionData);

    console.log("Parsing change log...");
    const operations = parseChangeLog(revisionData);
    console.log("Operations:", operations);
    console.log("Operation count:", operations.length);
    setOperations(operations);

    // Persist the writing session (metadata only) to the backend. Kept
    // non-fatal so a backend problem never breaks analysis or replay below.
    try {
      const saved = await saveSession(doc, operations);
      console.log("Saved session to backend:", saved?.id);
      setBackendStatus({ ok: true, id: saved?.id });
      setMetrics(saved?.metrics ?? null);
    } catch (backendError) {
      console.warn("Backend save failed (analysis still OK):", backendError.message);
      setBackendStatus({ ok: false, message: backendError.message });
    }

    console.log("Building playback frames...");
    const frames = buildFrames(operations, tilesData.userMap);
    console.log("Frames:", frames);
    console.log("Frame count:", frames.length);

    setFrames(frames);

    console.log("=== Analysis complete ===");
  } catch (error) {
    console.error("Analysis failed:", error);
    console.error("Stack:", error.stack);
    alert(error.message);
  } finally {
    setAnalyzing(false);
  }
}

return (
  <SidePanelUI
    loading={loading}
    doc={doc}
    googleToken={googleToken}
    documentData={documentData}
    wordCount={wordCount}
    revisions={revisions}
    analyzing={analyzing}
    analyzeDocument={analyzeDocument}
    frames={frames}
    operations={operations}
    charCount={charCount}
    backendStatus={backendStatus}
    metrics={metrics}
  />
);
}