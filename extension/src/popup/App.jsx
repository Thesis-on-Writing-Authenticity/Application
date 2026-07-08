import { useState } from 'react'

export default function App() {
  const [metadata, setMetadata] = useState(null)
  const [status, setStatus] = useState('')

  async function readMetadata() {
    setStatus('Reading current tab...')
    setMetadata(null)

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      if (!tab?.id) {
        setStatus('Open a Google Doc, then try again.')
        return
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'GET_GOOGLE_DOCS_METADATA',
      })

      if (!response?.ok) {
        setStatus('Could not read metadata from this document.')
        return
      }

      setMetadata(response.metadata)
      setStatus('Metadata collected.')
    } catch {
      setStatus(
        'Could not reach the Google Docs page. Reload the doc tab, reload the extension, then try again.',
      )
    }
  }

  return (
    <div style={{ width: 320, padding: 16, fontFamily: 'sans-serif' }}>
      <h3 style={{ margin: '0 0 12px' }}>Docs metadata</h3>
      <button onClick={readMetadata} style={{ width: '100%', padding: '8px 10px' }}>
        Read current doc
      </button>
      {status && <p style={{ margin: '12px 0 0', color: '#444' }}>{status}</p>}
      {metadata && (
        <pre
          style={{
            margin: '12px 0 0',
            padding: 12,
            maxHeight: 320,
            overflow: 'auto',
            background: '#f4f4f4',
            fontSize: 12,
            whiteSpace: 'pre-wrap',
          }}
        >
          {JSON.stringify(metadata, null, 2)}
        </pre>
      )}
    </div>
  )
}
