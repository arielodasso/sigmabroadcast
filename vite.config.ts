import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/sigmabroadcast/",
  plugins: [react()],
  server: {
    host: false,
    port: 5173,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
