import { useEffect, useState } from "react";

import { invoke } from "@tauri-apps/api/core";

import { DEFAULT_USER_CONFIG, UserConfig } from "@/types/onboarding.type";

export function useOnboarding() {
    const [config, setConfig] = useState<UserConfig>(DEFAULT_USER_CONFIG);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [shouldOnboard, setShouldOnboard] = useState(false);

    useEffect(() => {
        checkOnboardingStatus();
    }, []);

    const checkOnboardingStatus = async () => {
        try {
            const exists = await invoke<boolean>("check_user_config_exists");
            if (!exists) {
                setShouldOnboard(true);
            } else {
                const savedConfig = await invoke<UserConfig>("get_user_config");
                if (savedConfig && !savedConfig.onboardingCompleted) {
                    setShouldOnboard(true);
                    setConfig(savedConfig);
                } else {
                    setShouldOnboard(false);
                }
            }
        } catch (error) {
            setShouldOnboard(true);
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async (newConfig: Partial<UserConfig>) => {
        const updated = { ...config, ...newConfig };
        setConfig(updated);
        await invoke("save_user_config", { config: updated });
    };

    const nextStep = async (stepData: Partial<UserConfig>) => {
        await saveConfig(stepData);
        if (step === 6) {
            await saveConfig({ onboardingCompleted: true });
            window.location.href = "/";
        } else {
            setStep(step + 1);
        }
    };

    const generateUserCode = (): string => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%";
        let result = "";
        for (let i = 0; i < 30; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    return {
        config,
        step,
        loading,
        shouldOnboard,
        nextStep,
        saveConfig,
        generateUserCode,
    };
}
