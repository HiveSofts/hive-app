import { useOnboarding } from "@/hooks/useOnboarding";
import { Step1Intro } from "@/pages/onboarding/components/Step1Intro";
import { Step2Paths } from "@/pages/onboarding/components/Step2Paths";
import { Step3UserInfo } from "@/pages/onboarding/components/Step3UserInfo";
import { Step4GitHub } from "@/pages/onboarding/components/Step4GitHub";
import { Step5Theme } from "@/pages/onboarding/components/Step5Theme";
import { Step6Runtime } from "@/pages/onboarding/components/Step6runtime.tsx";

export function OnboardingWizard() {
    const { step, nextStep, generateUserCode, config } = useOnboarding();

    switch (step) {
        case 1:
            return <Step1Intro onNext={() => nextStep({})} />;
        case 2:
            return <Step2Paths onNext={(data) => nextStep(data)} />;
        case 3:
            return (
                <Step3UserInfo
                    onNext={(data) => nextStep(data)}
                    userCode={config.userCode || generateUserCode()}
                    generateCode={generateUserCode}
                />
            );
        case 4:
            return <Step4GitHub onNext={(data) => nextStep(data)} />;
        case 5:
            return <Step5Theme onComplete={(data) => nextStep(data)} />;
        case 6:
            return <Step6Runtime onNext={(data) => nextStep(data)} />;
        default:
            return null;
    }
}
