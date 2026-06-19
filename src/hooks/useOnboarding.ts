import { useEffect, useState } from "react";

import { invoke } from "@tauri-apps/api/core";

import { DEFAULT_USER_CONFIG, UserConfig } from "@/types/onboarding.type";

export function useOnboarding() {
    const [config, setConfig] = useState<UserConfig>(DEFAULT_USER_CONFIG);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const savedConfig = await invoke<UserConfig>("get_user_config");
            if (savedConfig) {
                setConfig(savedConfig);
            }
        } catch (error) {
            console.error(error);
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
        if (step === 5) {
            const finalConfig = { ...config, ...stepData, onboarding_complete: true };
            await invoke("complete_onboarding", { config: finalConfig });
            window.location.href = "/";
        } else {
            await saveConfig(stepData);
            setStep(step + 1);
        }
    };

    const prevStep = () => {
        if (step > 1) {
            setStep(step - 1);
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
        nextStep,
        prevStep,
        saveConfig,
        generateUserCode,
    };
}
