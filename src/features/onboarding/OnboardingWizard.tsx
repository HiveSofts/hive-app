import { OnboardingLayout } from "./OnboardingLayout";
import { Step1Intro } from "./components/Step1Intro";
import { Step2Paths } from "./components/Step2Paths";
import { Step3UserInfo } from "./components/Step3UserInfo";
import { Step4Theme } from "./components/Step4Theme";
import { Step5Runtime } from "./components/Step5Runtime";
import { useOnboarding } from "./hooks/useOnboarding";

function OnboardingContent() {
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
            return <Step4Theme onComplete={(data) => nextStep(data)} onBack={() => prevStep()} />;
        case 5:
            return (
                <Step5Runtime
                    onNext={(data) => {
                        nextStep(data);
                    }}
                />
            );
        default:
            return null;
    }
}

export function OnboardingWizard() {
    return (
        <OnboardingLayout>
            <OnboardingContent />
        </OnboardingLayout>
    );
}
