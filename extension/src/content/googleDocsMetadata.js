function getDocumentId() {
  const match = window.location.pathname.match(/\/document\/d\/([^/]+)/)
  return match?.[1] ?? null
}

function getDocumentTitle() {
  const titleInput = document.querySelector('input.docs-title-input')
  const rawTitle = titleInput?.value || document.title
  return rawTitle.replace(/ - Google Docs$/, '').trim()
}

function collectMetadata() {
  return {
    source: 'google-docs-content-script',
    document: {
      id: getDocumentId(),
      title: getDocumentTitle(),
      url: window.location.href,
    },
    writingProcess: {
      typingActivity: null,
      editingBehaviour: null,
      revisionFrequency: null,
      pasteEvents: null,
      sessionDuration: null,
      productionOrder: null,
    },
    notes: [
      'Placeholder scaffold only for now'
    ]
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'GET_GOOGLE_DOCS_METADATA') {
    return false
  }

  sendResponse({ ok: true, metadata: collectMetadata() })
  return true
})
