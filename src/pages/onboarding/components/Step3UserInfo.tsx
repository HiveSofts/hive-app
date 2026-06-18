import { useEffect, useState } from "react";

import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Check,
    Home,
    Mail,
    RefreshCw,
    User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

export function Step3UserInfo({
    onNext,
    onBack,
    userCode,
    generateCode,
}: {
    onNext: (data: any) => void;
    onBack: () => void;
    userCode: string;
    generateCode: () => string;
}) {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState(userCode);
    const [touched, setTouched] = useState({
        firstName: false,
        lastName: false,
        email: false,
    });

    useEffect(() => {
        if (!code) setCode(generateCode());
    }, []);

    const validateEmail = (email: string) => {
        const re = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
        return re.test(email);
    };

    const isValid = {
        firstName: firstName.trim().length >= 2,
        lastName: lastName.trim().length >= 2,
        email: validateEmail(email),
    };

    const allValid = isValid.firstName && isValid.lastName && isValid.email;

    const getFirstNameError = () => {
        if (!touched.firstName) return null;
        if (!firstName.trim()) return "First name is required";
        if (firstName.trim().length < 2) return "Must be at least 2 characters";
        return null;
    };

    const getLastNameError = () => {
        if (!touched.lastName) return null;
        if (!lastName.trim()) return "Last name is required";
        if (lastName.trim().length < 2) return "Must be at least 2 characters";
        return null;
    };

    const getEmailError = () => {
        if (!touched.email) return null;
        if (!email) return "Email is required";
        if (!validateEmail(email)) return "Please enter a valid email address";
        return null;
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
            <Card className="w-full max-w-2xl shadow-2xl border-0 dark:border-zinc-800">
                <CardHeader className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            Step 3 of 5
                        </span>
                        <span className="flex-1">
                            <Progress value={60} className="h-1" />
                        </span>
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight">
                        Tell us about yourself
                    </CardTitle>
                    <CardDescription className="text-base">
                        This helps us personalize your Hive experience.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1 text-sm font-medium">
                                First Name
                                <span className="text-red-500">*</span>
                                {isValid.firstName && touched.firstName && (
                                    <Check className="w-4 h-4 text-green-500 ml-auto" />
                                )}
                            </Label>
                            <Input
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                onBlur={() => setTouched({ ...touched, firstName: true })}
                                placeholder="John"
                                className={`transition-all ${
                                    getFirstNameError()
                                        ? "border-red-500 focus-visible:ring-red-500"
                                        : isValid.firstName && touched.firstName
                                          ? "border-green-500 focus-visible:ring-green-500"
                                          : ""
                                }`}
                            />
                            {getFirstNameError() && (
                                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {getFirstNameError()}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1 text-sm font-medium">
                                Last Name
                                <span className="text-red-500">*</span>
                                {isValid.lastName && touched.lastName && (
                                    <Check className="w-4 h-4 text-green-500 ml-auto" />
                                )}
                            </Label>
                            <Input
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                onBlur={() => setTouched({ ...touched, lastName: true })}
                                placeholder="Doe"
                                className={`transition-all ${
                                    getLastNameError()
                                        ? "border-red-500 focus-visible:ring-red-500"
                                        : isValid.lastName && touched.lastName
                                          ? "border-green-500 focus-visible:ring-green-500"
                                          : ""
                                }`}
                            />
                            {getLastNameError() && (
                                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {getLastNameError()}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-1 text-sm font-medium">
                            Email Address
                            <span className="text-red-500">*</span>
                            {isValid.email && touched.email && (
                                <Check className="w-4 h-4 text-green-500 ml-auto" />
                            )}
                        </Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onBlur={() => setTouched({ ...touched, email: true })}
                                placeholder="john@example.com"
                                className={`pl-9 transition-all ${
                                    getEmailError()
                                        ? "border-red-500 focus-visible:ring-red-500"
                                        : isValid.email && touched.email
                                          ? "border-green-500 focus-visible:ring-green-500"
                                          : ""
                                }`}
                            />
                        </div>
                        {getEmailError() && (
                            <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                                <AlertCircle className="w-3 h-3" />
                                {getEmailError()}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2 pt-2">
                        <Label className="text-sm font-medium">Your User Code</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    value={code}
                                    readOnly
                                    className="font-mono bg-muted/50 pr-16"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                    auto-generated
                                </span>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setCode(generateCode())}
                                type="button"
                                className="gap-2 shrink-0"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Regenerate
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            This unique code helps identify you for support and team collaboration.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button variant="outline" onClick={onBack} className="gap-2 flex-1">
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </Button>
                        <Button
                            onClick={() => onNext({ firstName, lastName, email, userCode: code })}
                            className="gap-2 flex-[2] bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700"
                            disabled={!allValid}
                        >
                            Continue
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
