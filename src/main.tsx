import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { PrivacyProvider } from "./contexts/PrivacyContext";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <PrivacyProvider>
        <App />
      </PrivacyProvider>
    </ThemeProvider>
  </StrictMode>
);
