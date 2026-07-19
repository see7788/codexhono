import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./todotree";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
