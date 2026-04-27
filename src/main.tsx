import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { setupGlobalErrorHandlers } from "@/hooks/useErrorLogging";
import { setupFetchInterceptor } from "@/lib/apiErrorLogger";
import { supabase } from "@/integrations/supabase/client";

const SESSION_ONLY_AUTH_FLAG = "clearSessionOnClose";
const ACTIVE_BROWSER_SESSION_FLAG = "browserSessionActive";

// Setup global error handlers for uncaught errors and promise rejections
setupGlobalErrorHandlers();

// Setup fetch interceptor to automatically log failed API requests
setupFetchInterceptor();

// Clear session-only logins only after the browser session has actually ended.
// `beforeunload` also fires during normal redirects/refreshes, which was deleting
// valid sessions immediately after login and causing session verification errors.
if (localStorage.getItem(SESSION_ONLY_AUTH_FLAG) === "true" &&
    sessionStorage.getItem(ACTIVE_BROWSER_SESSION_FLAG) !== "true") {
  const supabaseKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;
  localStorage.removeItem(supabaseKey);
  localStorage.removeItem(SESSION_ONLY_AUTH_FLAG);
}

sessionStorage.setItem(ACTIVE_BROWSER_SESSION_FLAG, "true");

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
