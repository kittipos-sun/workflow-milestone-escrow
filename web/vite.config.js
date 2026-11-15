import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/ethers/")) return "ethers";
          if (id.includes("/node_modules/react") || id.includes("/node_modules/scheduler/")) return "react-vendor";
        },
      },
    },
  },
});
