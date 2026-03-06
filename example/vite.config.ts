import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    manifest: true,
    outDir: "frontend/dist",
    rollupOptions: {
      input: "frontend/src/app.tsx",
    },
  },
  resolve: {
    alias: {
      // Force a single React copy when the library is linked via file:../
      // Not needed when installing from the npm registry.
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    },
  },
  server: {
    origin: "http://localhost:5173",
    cors: {
      origin: "http://localhost:4000",
    },
  },
});
