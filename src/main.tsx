import React from "react";
import ReactDOM from "react-dom/client";
import { logger } from "./lib/logger";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

const root = document.getElementById("root");

if (!root) {
  logger.error(new Error("Root element not found"), "main");
  throw new Error("Root element not found");
}

logger.info("Starting application");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
