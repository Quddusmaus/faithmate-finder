import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { setupGlobalErrorHandlers } from "@/hooks/useErrorLogging";
import { setupFetchInterceptor } from "@/lib/apiErrorLogger";
import { supabase } from "@/integrations/supabase/client";

// Setup global error handlers for uncaught errors and promise rejections
setupGlobalErrorHandlers();

// Setup fetch interceptor to automatically log failed API requests
setupFetchInterceptor();

// Clear session on browser close if "Remember me" was unchecked
window.addEventListener("beforeunload", () => {
  if (sessionStorage.getItem("clearSessionOnClose") === "true") {
    // Clear the Supabase session from localStorage
    const supabaseKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;
    localStorage.removeItem(supabaseKey);
    sessionStorage.removeItem("clearSessionOnClose");
  }
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
