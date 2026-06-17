import { useState } from "react";
import { Step1Intro } from "../components/Step1Intro";
import { Step2Paths } from "../components/Step2Paths";
import { Step3UserInfo } from "../components/Step3UserInfo";
import { Step4GitHub } from "../components/Step4GitHub";
import { Step5Theme } from "../components/Step5Theme";
import { Step6Runtime } from "../components/Step6runtime";

interface OnboardingWizardProps {
  onComplete?: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<Record<string, unknown>>({});

  const nextStep = (data: Record<string, unknown>) => {
    setConfig((prev) => ({ ...prev, ...data }));
    setStep((prev) => prev + 1);
  };

  const generateUserCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  switch (step) {
    case 1:
      return <Step1Intro onNext={() => nextStep({})} />;
    case 2:
      return <Step2Paths onNext={(data) => nextStep(data)} />;
    case 3:
      return (
        <Step3UserInfo
          onNext={(data) => nextStep(data)}
          userCode={config.userCode as string || generateUserCode()}
          generateCode={generateUserCode}
        />
      );
    case 4:
      return <Step4GitHub onNext={(data) => nextStep(data)} />;
    case 5:
      return <Step5Theme onComplete={(data) => nextStep(data)} />;
    case 6:
      return <Step6Runtime onNext={(data) => nextStep(data)} onComplete={handleComplete} />;
    default:
      return null;
  }
}