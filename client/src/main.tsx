import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.js";
import { isNativePlatform } from "./lib/nativeGoogleAuth.js";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
    },
  },
});

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
if (!googleClientId) {
  throw new Error("VITE_GOOGLE_CLIENT_ID environment variable is required");
}

const content = (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </QueryClientProvider>
);

// The native app shell uses nativeGoogleAuth.ts (Capacitor's native Google Sign-In SDKs)
// instead, so there's no need to load @react-oauth/google's web SDK there — it just makes an
// unused network request for a script the native shell can't use anyway.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isNativePlatform ? content : <GoogleOAuthProvider clientId={googleClientId}>{content}</GoogleOAuthProvider>}
  </React.StrictMode>
);
