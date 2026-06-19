import { useOnboarding } from "@/hooks/useOnboarding";

import { Step1Intro } from "./components/Step1Intro";
import { Step2Paths } from "./components/Step2Paths";
import { Step3UserInfo } from "./components/Step3UserInfo";
import { Step5Theme } from "./components/Step5Theme";
import { Step6Runtime } from "./components/Step6runtime";

export function OnboardingWizard() {
    const { step, nextStep, prevStep, generateUserCode, config } = useOnboarding();

    switch (step) {
        case 1:
            return <Step1Intro onNext={() => nextStep({})} />;
        case 2:
            return <Step2Paths onNext={(data) => nextStep(data)} onBack={() => prevStep()} />;
        case 3:
            return (
                <Step3UserInfo
                    onNext={(data) => nextStep(data)}
                    onBack={() => prevStep()}
                    userCode={config.userCode || generateUserCode()}
                    generateCode={generateUserCode}
                />
            );
        case 4:
            return <Step5Theme onComplete={(data) => nextStep(data)} onBack={() => prevStep()} />;
        case 5:
            return (
                <Step6Runtime
                    onNext={(data) => {
                        nextStep(data);
                    }}
                />
            );
        default:
            return null;
    }
}
