import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import createManifest from "./manifest.config.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      crx({
        manifest: createManifest(env.VITE_GOOGLE_CLIENT_ID),
      }),
    ],

    build: {
      rollupOptions: {
        input: {
          sidepanel: "src/sidepanel/index.html",
        },
      },
    },
  };
});
