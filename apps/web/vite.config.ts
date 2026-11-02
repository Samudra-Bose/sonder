import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("react-router-dom") || id.includes("/react/")) {
              return "vendor-react";
            }
            if (id.includes("@base-ui")) {
              return "vendor-base-ui";
            }
            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }
            if (id.includes("@tanstack")) {
              return "vendor-query";
            }
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
});
