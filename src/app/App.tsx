import { router } from "@/config/routes";
import { OnboardingWizard } from "@/features/onboarding/OnboardingWizard";

import { useEffect, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { isEnabled } from "@tauri-apps/plugin-autostart";
import { RouterProvider } from "react-router-dom";

import { UserConfig } from "../features/onboarding/types";

function App() {
    const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const config = await invoke<UserConfig>("get_user_config");

                if (config?.theme) {
                    applyTheme(config.theme);
                }

                try {
                    const autostartEnabled = await isEnabled();
                    console.log("Autostart status:", autostartEnabled ? "enabled" : "disabled");
                } catch (e) {
                    // ignore
                }
            } catch (error) {
                console.error("Failed to load user config:", error);
            }

            try {
                const status = await invoke<boolean>("get_onboarding_status");
                setShowOnboarding(!status);
            } catch {
                setShowOnboarding(true);
            }
        };

        init();
    }, []);

    const applyTheme = (theme: "light" | "dark" | "system") => {
        const isDark =
            theme === "dark" ||
            (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

        document.documentElement.classList.toggle("dark", isDark);
    };

    if (showOnboarding === null) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-950">
                <img src="/hive.png" alt="Hive" className="w-16 h-16 animate-pulse" />
            </div>
        );
    }

    return showOnboarding ? <OnboardingWizard /> : <RouterProvider router={router} />;
}

export default App;
