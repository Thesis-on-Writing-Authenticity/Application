import { useEffect, useState } from "react";
import { loginGoogle } from "../api/googleAuth";
import { getGoogleDocument, getGoogleDocsRevisions } from "../api/googleDocs";
import { getRevisions } from "../api/googleDrive";
import { extractText } from "../parser/documentParser";
import { parseModelChunk } from "../parser/chunkParser";
import { parseChangeLog } from "../parser/changelogParser";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [googleToken, setGoogleToken] = useState(null);
  const [documentData, setDocumentData] = useState(null);
  const [parsedDocument, setParsedDocument] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [wordCount, setWordCount] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);

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

  async function inspectPage() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      return;
    }

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_DATA" }, (data) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          resolve(null);
          return;
        }

        console.log("PAGE DATA", data);
        resolve(data);
      });
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
        console.log("MODEL", data);

        if (!data?.found) {
          resolve(null);
          return;
        }

        const parsed = parseModelChunk(data.model);

        setParsedDocument(parsed);

        resolve({
          parsed,
          model: data.model,
        });
      });
    });
  }

  async function analyzeDocument() {
    try {
      setAnalyzing(true);

      await inspectPage();

      const modelData = await getModel();

      console.log("Raw model:", modelData.model);

      const latestRevision = modelData?.model?.revision
      console.log("Latest revision:", latestRevision);

      const token = await loginGoogle();
      setGoogleToken(token);

      const document = await getGoogleDocument(doc.id, token);
      console.log("Google Docs response:", document);

      setDocumentData(document);

      const text = extractText(document);
      console.log("Document text:", text);

      setWordCount(text.trim().split(/\s+/).filter(Boolean).length);

      const driveRevisions = await getRevisions(doc.id, token);
      console.log("Drive revisions:", driveRevisions);

      setRevisions(driveRevisions);

      const docsRevisions = await getGoogleDocsRevisions(doc.id, 1, latestRevision, token);

      console.log("Docs revisions/load:", docsRevisions);

      const cleaned = docsRevisions.replace(")]}'", "").trim();

      const revisionData = JSON.parse(cleaned);

      console.log(revisionData);

      const operations = parseChangeLog(revisionData);

      console.table(operations);

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

      {parsedDocument && (
        <>
          <hr />
          <h3>Reconstructed Document</h3>
          <p>
            Characters:
            <b> {parsedDocument.characters}</b>
          </p>
          <p>
            Words:
            <b> {parsedDocument.words}</b>
          </p>
          <textarea
            readOnly
            value={parsedDocument.text}
            style={{
              width: "100%",
              height: 150,
            }}
          />
        </>
      )}
    </div>
  );
}
