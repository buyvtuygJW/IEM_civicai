import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// When running via `npm run dev` directly on your machine, the backend is at
// localhost:8000. When running via docker-compose, the frontend container
// reaches the backend container by its service name, so docker-compose.yml
// sets BACKEND_URL=http://backend:8000 for you automatically.
const backendTarget = process.env.BACKEND_URL || "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
});
