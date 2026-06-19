import { useEffect, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { RouterProvider } from "react-router-dom";

import { OnboardingWizard } from "./pages/onboarding/OnboardingWizard";
import { router } from "./routes";

function App() {
    const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

    useEffect(() => {
        checkOnboardingStatus();
    }, []);

    const checkOnboardingStatus = async () => {
        try {
            const status = await invoke<boolean>("get_onboarding_status");
            setShowOnboarding(!status);
        } catch {
            setShowOnboarding(true);
        }
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
