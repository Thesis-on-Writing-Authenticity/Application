import { useEffect, useState } from "react";

import { loginGoogle } from "../api/googleAuth";
import { getGoogleDocument } from "../api/googleDocs";
import { getRevisions } from "../api/googleDrive";
import { extractText } from "../parser/documentParser";
import { parseModelChunk } from "../parser/chunkParser";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState(null);
  const [googleToken, setGoogleToken] = useState(null);
  const [documentData, setDocumentData] = useState(null);
  const [revisions, setRevisions] = useState([]);
  const [wordCount, setWordCount] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [parsedDocument, setParsedDocument] = useState(null);

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

      const token = await loginGoogle();

      setGoogleToken(token);

      const document = await getGoogleDocument(doc.id, token);

      setDocumentData(document);

      const text = extractText(document);

      setWordCount(text.trim().split(/\s+/).filter(Boolean).length);

      const rev = await getRevisions(doc.id, token);

      setRevisions(rev);
    } catch (error) {
      console.error(error);

      alert(error.message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function getModel() {
    const [tab] = await chrome.tabs.query({
      active: true,

      currentWindow: true,
    });

    chrome.tabs.sendMessage(
      tab.id,

      {
        type: "GET_MODEL_CHUNK",
      },

      (data) => {
        console.log("MODEL", data);

        if (data.found) {
          const parsed = parseModelChunk(data.model);

          setParsedDocument(parsed);
        }
      },
    );
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

      <button
        onClick={getModel}
        style={{
          marginLeft: 10,
        }}
      >
        Get Model
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
            style={{
              width: "100%",

              height: 150,
            }}
            value={parsedDocument.text}
            readOnly
          />
        </>
      )}
    </div>
  );
}
