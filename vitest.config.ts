import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Unit tests import modules that build the Supabase client at load time.
    // Without a .env, createClient() throws "supabaseUrl is required" and the
    // whole file fails before any test runs. Give it a dummy local project so
    // unit tests never depend on (or talk to) a real Supabase project.
    env: {
      VITE_SUPABASE_URL: "http://127.0.0.1:54321",
      VITE_SUPABASE_PUBLISHABLE_KEY: "unit-test-anon-key",
      VITE_SUPABASE_ANON_KEY: "unit-test-anon-key",
      VITE_SUPABASE_PROJECT_ID: "unit-test",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
