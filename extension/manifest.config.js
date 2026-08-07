import { defineManifest } from "@crxjs/vite-plugin";

export default (clientId) =>
  defineManifest({
    manifest_version: 3,
    name: "Writing Authenticity",
    version: "0.0.1",
    description: "Collect writing metadata from Google Docs",

    icons: {
      16: "icons/icon16.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png",
    },

    permissions: [
      "identity",
      "storage",
      "tabs",
      "activeTab",
      "scripting",
      "sidePanel",
    ],

    host_permissions: [
      "https://docs.google.com/*",
      "https://www.googleapis.com/*",
    ],

    oauth2: {
      client_id: clientId,

      scopes: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/documents.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    },

    background: {
      service_worker: "src/background/index.js",

      type: "module",
    },

    side_panel: {
      default_path: "src/sidepanel/index.html",
    },

    action: {
      default_title: "Open Writing Authenticity",

      default_icon: {
        16: "icons/icon16.png",
        48: "icons/icon48.png",
        128: "icons/icon128.png",
      },
    },

    content_scripts: [
      {
        matches: ["https://docs.google.com/document/*"],
        js: ["src/content/googleDocsContentScript.js"],
        run_at: "document_idle",
      },
    ],
  });
