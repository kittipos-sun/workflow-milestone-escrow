import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  esbuild: { jsx: "automatic" },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/ethers/")) return "ethers";
          if (id.includes("/node_modules/three/")) return "three-vendor";
          if (id.includes("/node_modules/react") || id.includes("/node_modules/scheduler/")) return "react-vendor";
        },
      },
    },
  },
});
