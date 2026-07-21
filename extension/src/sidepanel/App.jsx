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

export default function App() {
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [googleToken, setGoogleToken] = useState(null);
  const [documentData, setDocumentData] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [wordCount, setWordCount] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [frames, setFrames] = useState([]);

  useEffect(() => {
    loadDocument();
  }, []);

  async function loadDocument() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    chrome.tabs.sendMessage(
      tab.id,

      {
        type: "GET_DOC_INFO",
      },

      (response) => {
        setDoc(response);

        setLoading(false);
      },
    );
  }

  async function analyzeDocument() {
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

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        padding: 20,
        width: 380,
        fontFamily: "Arial",
      }}
    >
      <h2>Writing Authenticity</h2>
      <hr />
      <h3>Document</h3>
      <p>{doc?.title}</p>
      <code>{doc?.id}</code>
      <br />
      <br />

      <button onClick={analyzeDocument} disabled={analyzing}>
        {analyzing ? "Analyzing..." : "Analyze Document"}
      </button>

      {googleToken && <p>✅ Google connected</p>}

      {documentData && (
        <>
          <hr />
          <h3>Statistics</h3>
          <p>
            Words:
            <b> {wordCount}</b>
          </p>
          <p>
            Revisions:
            <b> {revisions.length}</b>
          </p>
        </>
      )}

      <PlaybackViewer frames={frames} />
      <StatsBar stats={buildUserStats(frames)} />
    </div>
  );
}
