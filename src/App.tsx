import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RouterProvider } from "react-router-dom";
import { LoadingScreen } from "./app/components/ui/loading-screen";
import { router } from "./app/routes";
import OnboardingWizard from "./app/modules/onboarding/pages/OnboardingWizard";

interface UserConfig {
  onboardingCompleted: boolean;
  [key: string]: unknown;
}

function App() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const config = await invoke<UserConfig>("get_user_config");
      if (config && config.onboardingCompleted) {
        setShowOnboarding(false);
      } else {
        setShowOnboarding(true);
      }
    } catch {
      setShowOnboarding(true);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  if (showOnboarding === null) {
    return <LoadingScreen />;
  }

  return showOnboarding ? (
    <OnboardingWizard onComplete={handleOnboardingComplete} />
  ) : (
    <RouterProvider router={router} />
  );
}

export default App;