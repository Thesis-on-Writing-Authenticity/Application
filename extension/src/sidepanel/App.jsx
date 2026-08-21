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
import SidePanelUI from "./SidePanelUI";
import { saveSession } from "../api/writingEvents";
import { getSessionAnalysis } from "../api/backend";

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

    try {
      setAnalyzing(true);

      // Clear previous analysis
      setAnalysis(null);
      setAnalysisError(null);

      console.log("=== Starting document analysis ===");
      console.log("Document ID:", doc.id);

      // ---------------------------------------------------------
      // GET GOOGLE DOC MODEL
      // ---------------------------------------------------------

      console.log("Fetching model...");

      const modelData = await getModel();

      console.log("Model data:", modelData);

      const latestRevision = modelData?.model?.revision;

      console.log("Latest revision:", latestRevision);

      // ---------------------------------------------------------
      // GOOGLE AUTH
      // ---------------------------------------------------------

      console.log("Logging into Google...");

      const token = await loginGoogle();

      console.log(
        "Google token acquired:",
        token ? "YES" : "NO"
      );

      setGoogleToken(token);

      // ---------------------------------------------------------
      // GOOGLE DOC DATA
      // ---------------------------------------------------------

      console.log("Fetching Google Docs tiles...");

      const tilesData = await getGoogleDocsTiles(
        doc.id,
        token
      );

      console.log("Tiles data:", tilesData);

      console.log("Fetching Google Document...");

      const document = await getGoogleDocument(
        doc.id,
        token
      );

      console.log("Document:", document);

      setDocumentData(document);

      // ---------------------------------------------------------
      // DOCUMENT TEXT
      // ---------------------------------------------------------

      const text = extractText(document);

      console.log("Extracted text:", text);

      const words = text
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .length;

      setWordCount(words);
      setCharCount(text.length);

      // ---------------------------------------------------------
      // DRIVE REVISIONS
      // ---------------------------------------------------------

      console.log("Fetching Drive revisions...");

      const driveRevisions = await getRevisions(
        doc.id,
        token
      );

      console.log(
        "Drive revisions:",
        driveRevisions
      );

      setRevisions(driveRevisions);

      // ---------------------------------------------------------
      // DOCS CHANGELOG
      // ---------------------------------------------------------

      console.log(
        "Fetching Docs revision changelog..."
      );

      const docsRevisions =
        await getGoogleDocsRevisions(
          doc.id,
          1,
          latestRevision,
          token
        );

      console.log(
        "Raw Docs revisions:",
        docsRevisions
      );

      const cleaned = docsRevisions
        .replace(")]}'", "")
        .trim();

      const revisionData = JSON.parse(cleaned);

      console.log(
        "Parsed revision data:",
        revisionData
      );

      // ---------------------------------------------------------
      // PARSE OPERATIONS
      // ---------------------------------------------------------

      console.log("Parsing change log...");

      const parsedOperations =
        parseChangeLog(revisionData);

      console.log(
        "Operations:",
        parsedOperations
      );

      console.log(
        "Operation count:",
        parsedOperations.length
      );

      setOperations(parsedOperations);

      // ---------------------------------------------------------
      // BACKEND SESSION
      // ---------------------------------------------------------

      try {
        console.log(
          "Saving writing session to backend..."
        );

        const saved = await saveSession(
          doc,
          parsedOperations
        );

        console.log(
          "Saved session:",
          saved
        );

        if (!saved?.id) {
          throw new Error(
            "Backend did not return a session ID."
          );
        }

        const sessionId = saved.id;

        console.log(
          "Backend session ID:",
          sessionId
        );

        setBackendStatus({
          ok: true,
          id: sessionId,
        });

        // These are the computed behavioural metrics
        // returned by GET /api/sessions/:id
        setMetrics(saved.metrics ?? null);

        // -------------------------------------------------------
        // AUTHENTICITY ANALYSIS
        // -------------------------------------------------------

        try {
          setAnalysisLoading(true);
          setAnalysisError(null);

          console.log(
            `Requesting authenticity analysis for ${sessionId}...`
          );

          const analysisResult =
            await getSessionAnalysis(sessionId);

          console.log(
            "=== AUTHENTICITY ANALYSIS RESULT ==="
          );

          console.log(analysisResult);

          setAnalysis(analysisResult);
        } catch (error) {
          console.error(
            "Authenticity analysis failed:",
            error
          );

          setAnalysisError(
            error.message ||
              "Failed to retrieve authenticity analysis."
          );
        } finally {
          setAnalysisLoading(false);
        }
      } catch (backendError) {
        console.warn(
          "Backend save failed:",
          backendError.message
        );

        setBackendStatus({
          ok: false,
          message: backendError.message,
        });

        setMetrics(null);
        setAnalysis(null);
      }

      // ---------------------------------------------------------
      // PLAYBACK
      // ---------------------------------------------------------

      console.log(
        "Building playback frames..."
      );

      const builtFrames = buildFrames(
        parsedOperations,
        tilesData.userMap
      );

      console.log(
        "Frames:",
        builtFrames
      );

      console.log(
        "Frame count:",
        builtFrames.length
      );

      setFrames(builtFrames);

      console.log(
        "=== Analysis complete ==="
      );
    } catch (error) {
      console.error(
        "Analysis failed:",
        error
      );

      console.error(
        "Stack:",
        error.stack
      );

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
      analysis={analysis}
      analysisLoading={analysisLoading}
      analysisError={analysisError}
    />
  );
}