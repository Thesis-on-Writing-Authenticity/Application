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

    chrome.tabs.sendMessage(tab.id, { type: "GET_DOC_INFO" }, (response) => {
      setDoc(response);
      setLoading(false);
    });
  }

  async function getModel() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      return null;
    }

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { type: "GET_MODEL_CHUNK" }, (data) => {
        if (!data?.found) {
          resolve(null);
          return;
        }

        resolve({ model: data.model });
      });
    });
  }

  async function analyzeDocument() {
    try {
      setAnalyzing(true);

      const modelData = await getModel();
      const latestRevision = modelData?.model?.revision;

      const token = await loginGoogle();
      setGoogleToken(token);

      const tilesData = await getGoogleDocsTiles(doc.id, token);

      const document = await getGoogleDocument(doc.id, token);
      setDocumentData(document);

      const text = extractText(document);
      setWordCount(text.trim().split(/\s+/).filter(Boolean).length);

      const driveRevisions = await getRevisions(doc.id, token);
      setRevisions(driveRevisions);

      const docsRevisions = await getGoogleDocsRevisions(doc.id, 1, latestRevision, token);
      const cleaned = docsRevisions.replace(")]}'", "").trim();
      const revisionData = JSON.parse(cleaned);

      const operations = parseChangeLog(revisionData);
      const frames = buildFrames(operations, tilesData.userMap);

      setFrames(frames);
    } catch (error) {
      console.error(error);
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
