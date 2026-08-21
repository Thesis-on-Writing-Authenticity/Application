# Application Verifying Writing Authenticity

This repository contains the prototype developed for the thesis **Development of an Application Verifying Writing Authenticity**.

The application is a Chrome extension that reconstructs the writing process of Google Docs documents by analyzing revision history. Instead of evaluating only the final submitted text, it provides an interactive playback of document edits together with writing statistics to support authenticity review.

The application is intended as a decision-support tool for teachers and reviewers. It does **not** determine whether a document was AI-generated or make automatic academic integrity decisions.

---

## Thesis Context

Traditional AI text detectors often produce unreliable results and false positives when used as the sole basis for determining authorship. This thesis investigates whether Google Docs revision history can provide more transparent and explainable evidence by reconstructing how a document was written rather than evaluating only its final content.

---

## Features

The current prototype can:

- Authenticate users with Google OAuth 2.0
- Detect the currently opened Google Docs document
- Retrieve document metadata
- Retrieve revision metadata using the Google Drive API
- Download Google Docs revision changelog data
- Parse revision operations
- Reconstruct document states from revision history
- Replay the writing process step-by-step
- Display document metadata
- Display writing statistics including:
  - Word count
  - Revision count
  - Reconstructed operation count

---

## How It Works

The extension performs the following workflow:

1. Authenticate with Google.
2. Retrieve document metadata.
3. Retrieve revision metadata.
4. Extract Google Docs revision data.
5. Decode and parse revision operations.
6. Reconstruct document states.
7. Generate playback frames.
8. Display an interactive replay together with writing statistics.

---

## Limitations

### Edit Permissions Required

The authenticated Google account must have **Edit** access to the document. Users with **Viewer** or **Commenter** permissions cannot access the revision information required to reconstruct the writing process.

### Undocumented Google Docs Endpoints

Google's public APIs do not expose the low-level revision operations required for playback reconstruction. This prototype therefore relies on reverse engineered internal Google Docs revision endpoints and changelog formats.

Because these endpoints are undocumented and unsupported, Google may change or remove them without notice. As a result, future updates to Google Docs may require modifications to the prototype.

---

## Privacy and Ethics

The prototype analyzes revision metadata that already exists within Google Docs and is intended solely to support human review. It does not make automated integrity decisions and should not be used as the sole basis for determining academic misconduct.

---

## Technologies

- React
- Vite
- Chrome Extension Manifest V3
- JavaScript
- Google OAuth 2.0
- Google Docs API
- Google Drive API

---

## Repository Structure

```text
Application/
├── README.md
└── extension/
    ├── src/
    │   ├── api/
    │   ├── background/
    │   ├── components/
    │   ├── content/
    │   ├── handlers/
    │   ├── parser/
    │   ├── replay/
    │   └── sidepanel/
    │       ├── App.jsx
    │       └── main.jsx
    ├── public/
    │   └── icons/
    ├── manifest.config.js
    ├── vite.config.js
    ├── package.json
    └── .env
```

---

## Project Scope and License

This repository accompanies the thesis **Development of an Application Verifying Writing Authenticity** and contains an academic proof-of-concept rather than a production-ready application. It demonstrates how Google Docs revision metadata can be reconstructed to support writing authenticity review in educational contexts.

The software is provided for research and educational purposes only.
