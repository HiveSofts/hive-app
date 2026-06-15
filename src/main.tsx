import React from "react";

import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";

import { TooltipProvider } from "@/components/ui/tooltip";

import App from "./App";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <TooltipProvider>
            <App />
            <Toaster richColors position="top-right" />
        </TooltipProvider>
    </React.StrictMode>
);
