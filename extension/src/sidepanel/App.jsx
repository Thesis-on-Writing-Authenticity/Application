import { useEffect, useRef, useState } from "react";
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
import SidePanelUI from "./SidepanelUI";
import { saveSession } from "../api/writingEvents";
import { getSessionAnalysis } from "../api/backend";

const DEBUG = true; // Set to true to enable console logging for debugging.

function debugLog(...args) {
  if (DEBUG) {
    console.log(...args);
  }
}

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

  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  const runIdRef = useRef(0);

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
      }
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
      alert(
        "Open a Google Docs document in the active tab, then reopen this panel."
      );
      return;
    }

    const runId = ++runIdRef.current;
    const isCurrentRun = () => runIdRef.current === runId;

    try {
      setAnalyzing(true);
      setAnalysis(null);
      setAnalysisError(null);
      setBackendStatus(null);

      debugLog("=== Starting document analysis ===");
      debugLog("Document ID:", doc.id);

      debugLog("Fetching model...");

      const modelData = await getModel();

      debugLog("Model data:", modelData);

      const latestRevision = modelData?.model?.revision;

      debugLog("Latest revision:", latestRevision);


      debugLog("Logging into Google...");

      const token = await loginGoogle();

      debugLog("Google token acquired:", token ? "YES" : "NO");

      if (!isCurrentRun()) return;
      setGoogleToken(token);

      debugLog("Fetching Google Docs tiles...");

      const tilesData = await getGoogleDocsTiles(doc.id, token);

      debugLog("Tiles data:", tilesData);

      debugLog("Fetching Google Document...");

      const document = await getGoogleDocument(doc.id, token);

      debugLog("Document:", document);

      if (!isCurrentRun()) return;
      setDocumentData(document);

      const text = extractText(document);

      debugLog("Extracted text length:", text.length);

      const words = text.trim().split(/\s+/).filter(Boolean).length;

      if (!isCurrentRun()) return;
      setWordCount(words);
      setCharCount(text.length);

      debugLog("Fetching Drive revisions...");

      const driveRevisions = await getRevisions(doc.id, token);

      debugLog("Drive revisions:", driveRevisions);

      if (!isCurrentRun()) return;
      setRevisions(driveRevisions);


      debugLog("Fetching Docs revision changelog...");

      const docsRevisions = await getGoogleDocsRevisions(
        doc.id,
        1,
        latestRevision,
        token
      );

      debugLog("Raw Docs revisions length:", docsRevisions?.length);

      let revisionData;
      try {
        const cleaned = docsRevisions.replace(")]}'", "").trim();
        revisionData = JSON.parse(cleaned);
      } catch (parseError) {
        throw new Error(
          `Failed to parse the Docs revision changelog: ${parseError.message}`
        );
      }

      debugLog("Parsed revision data:", revisionData);
      debugLog("Parsing change log...");

      let parsedOperations;
      try {
        parsedOperations = parseChangeLog(revisionData);
      } catch (parseError) {
        throw new Error(
          `Failed to parse change log operations: ${parseError.message}`
        );
      }

      debugLog("Operation count:", parsedOperations.length);

      if (!isCurrentRun()) return;
      setOperations(parsedOperations);

      try {
        debugLog("Saving writing session to backend...");

        const saved = await saveSession(doc, parsedOperations);

        debugLog("Saved session:", saved);

        if (!saved?.id) {
          throw new Error("Backend did not return a session ID.");
        }

        const sessionId = saved.id;

        debugLog("Backend session ID:", sessionId);

        if (!isCurrentRun()) return;

        setBackendStatus({ ok: true, id: sessionId });

        setMetrics(saved.metrics ?? null);



        try {
          setAnalysisLoading(true);
          setAnalysisError(null);

          debugLog(`Requesting authenticity analysis for ${sessionId}...`);

          const analysisResult = await getSessionAnalysis(sessionId);

          debugLog("=== AUTHENTICITY ANALYSIS RESULT ===", analysisResult);

          if (!isCurrentRun()) return;
          setAnalysis(analysisResult);
        } catch (error) {
          console.error("Authenticity analysis failed:", error);

          if (!isCurrentRun()) return;
          setAnalysisError(
            error.message || "Failed to retrieve authenticity analysis."
          );
        } finally {
          if (isCurrentRun()) {
            setAnalysisLoading(false);
          }
        }
      } catch (backendError) {
        console.warn("Backend save failed:", backendError.message);

        if (!isCurrentRun()) return;
        setBackendStatus({ ok: false, message: backendError.message });
        setMetrics(null);
        setAnalysis(null);
        setAnalysisError(null);
      }

      debugLog("Building playback frames...");

      const builtFrames = buildFrames(parsedOperations, tilesData.userMap);

      debugLog("Frame count:", builtFrames.length);

      if (!isCurrentRun()) return;
      setFrames(builtFrames);

      debugLog("=== Analysis complete ===");
    } catch (error) {
      console.error("Analysis failed:", error);

      if (isCurrentRun()) {
        setAnalysisError(error.message);
        alert(error.message);
      }
    } finally {
      if (isCurrentRun()) {
        setAnalyzing(false);
      }
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
      analysis={analysis}
      analysisLoading={analysisLoading}
      analysisError={analysisError}
    />
  );
}