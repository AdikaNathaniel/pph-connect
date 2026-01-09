import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { readFileSync } from "fs";

// Read version from package.json
const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf-8"));
const version = packageJson.version;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Inject version from package.json
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
  },
}));
