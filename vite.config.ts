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
  server: {
    origin: "http://localhost:5173",
    cors: {
      origin: "http://localhost:4000",
    },
  },
});
