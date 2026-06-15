import { useEffect, useState } from "react";

import { AlertCircle, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Step3UserInfo({
    onNext,
    userCode,
    generateCode,
}: {
    onNext: (data: any) => void;
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
        if (firstName.trim().length < 2) return "First name must be at least 2 characters";
        return null;
    };

    const getLastNameError = () => {
        if (!touched.lastName) return null;
        if (!lastName.trim()) return "Last name is required";
        if (lastName.trim().length < 2) return "Last name must be at least 2 characters";
        return null;
    };

    const getEmailError = () => {
        if (!touched.email) return null;
        if (!email) return "Email is required";
        if (!validateEmail(email)) return "Please enter a valid email address";
        return null;
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-white dark:from-zinc-950 dark:to-zinc-900">
            <Card className="w-full max-w-2xl shadow-2xl">
                <CardHeader>
                    <CardTitle className="text-2xl">Tell us about yourself</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                                First Name <span className="text-red-500">*</span>
                                {isValid.firstName && touched.firstName && (
                                    <Check className="w-4 h-4 text-green-500 ml-1" />
                                )}
                            </Label>
                            <Input
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                onBlur={() => setTouched({ ...touched, firstName: true })}
                                placeholder="John"
                                className={
                                    getFirstNameError()
                                        ? "border-red-500 focus-visible:ring-red-500"
                                        : ""
                                }
                            />
                            {getFirstNameError() && (
                                <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {getFirstNameError()}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                                Last Name <span className="text-red-500">*</span>
                                {isValid.lastName && touched.lastName && (
                                    <Check className="w-4 h-4 text-green-500 ml-1" />
                                )}
                            </Label>
                            <Input
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                onBlur={() => setTouched({ ...touched, lastName: true })}
                                placeholder="Doe"
                                className={
                                    getLastNameError()
                                        ? "border-red-500 focus-visible:ring-red-500"
                                        : ""
                                }
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
                        <Label className="flex items-center gap-1">
                            Email <span className="text-red-500">*</span>
                            {isValid.email && touched.email && (
                                <Check className="w-4 h-4 text-green-500 ml-1" />
                            )}
                        </Label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={() => setTouched({ ...touched, email: true })}
                            placeholder="john@example.com"
                            className={
                                getEmailError() ? "border-red-500 focus-visible:ring-red-500" : ""
                            }
                        />
                        {getEmailError() && (
                            <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                                <AlertCircle className="w-3 h-3" />
                                {getEmailError()}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Your User Code</Label>
                        <div className="flex gap-2">
                            <Input value={code} readOnly className="font-mono bg-muted" />
                            <Button
                                variant="outline"
                                onClick={() => setCode(generateCode())}
                                type="button"
                            >
                                Regenerate
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Use this code for support and identification
                        </p>
                    </div>

                    <Button
                        onClick={() => onNext({ firstName, lastName, email, userCode: code })}
                        className="w-full bg-amber-500 hover:bg-amber-600"
                        disabled={!allValid}
                    >
                        Next →
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
