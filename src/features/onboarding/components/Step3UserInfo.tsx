import { useEffect, useState } from "react";

import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, ArrowRight, Check, Mail, RefreshCw, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

interface Step3UserInfoProps {
    onNext: (data: {
        firstName: string;
        lastName: string;
        email: string;
        userCode: string;
    }) => void;
    onBack: () => void;
    userCode: string;
    generateCode: () => string;
}

export function Step3UserInfo({ onNext, onBack, userCode, generateCode }: Step3UserInfoProps) {
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
    }, [code, generateCode]);

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
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex min-h-screen items-center justify-center p-4"
        >
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="w-full max-w-2xl"
            >
                <Card className="w-full shadow-2xl border-0 dark:border-zinc-800 backdrop-blur-sm bg-white/90 dark:bg-zinc-900/90">
                    <CardHeader className="space-y-1">
                        <motion.div
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.4 }}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                            <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                Step 3 of 5
                            </span>
                            <span className="flex-1">
                                <Progress value={60} className="h-1" />
                            </span>
                        </motion.div>

                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.4 }}
                        >
                            <CardTitle className="text-3xl font-bold tracking-tight">
                                Tell us about yourself
                            </CardTitle>
                            <CardDescription className="text-base mt-1">
                                This helps us personalize your Hive experience.
                            </CardDescription>
                        </motion.div>
                    </CardHeader>

                    <CardContent className="space-y-6 pt-4">
                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.4 }}
                            className="grid grid-cols-2 gap-4"
                        >
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1 text-sm font-medium">
                                    First Name
                                    <span className="text-red-500">*</span>
                                    {isValid.firstName && touched.firstName && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: "spring", bounce: 0.5 }}
                                        >
                                            <Check className="w-4 h-4 text-green-500 ml-auto" />
                                        </motion.div>
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
                                    <motion.p
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-sm text-red-500 flex items-center gap-1 mt-1"
                                    >
                                        <AlertCircle className="w-3 h-3" />
                                        {getFirstNameError()}
                                    </motion.p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1 text-sm font-medium">
                                    Last Name
                                    <span className="text-red-500">*</span>
                                    {isValid.lastName && touched.lastName && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: "spring", bounce: 0.5 }}
                                        >
                                            <Check className="w-4 h-4 text-green-500 ml-auto" />
                                        </motion.div>
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
                                    <motion.p
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-sm text-red-500 flex items-center gap-1 mt-1"
                                    >
                                        <AlertCircle className="w-3 h-3" />
                                        {getLastNameError()}
                                    </motion.p>
                                )}
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.6, duration: 0.4 }}
                            className="space-y-2"
                        >
                            <Label className="flex items-center gap-1 text-sm font-medium">
                                Email Address
                                <span className="text-red-500">*</span>
                                {isValid.email && touched.email && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", bounce: 0.5 }}
                                    >
                                        <Check className="w-4 h-4 text-green-500 ml-auto" />
                                    </motion.div>
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
                                <motion.p
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-sm text-red-500 flex items-center gap-1 mt-1"
                                >
                                    <AlertCircle className="w-3 h-3" />
                                    {getEmailError()}
                                </motion.p>
                            )}
                        </motion.div>

                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.7, duration: 0.4 }}
                            className="space-y-2 pt-2"
                        >
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
                                    className="gap-2 shrink-0 transition-all duration-300 hover:shadow-md hover:scale-105 active:scale-95"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Regenerate
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                This unique code helps identify you for support and team
                                collaboration.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.8, duration: 0.4 }}
                            className="flex gap-3 pt-4"
                        >
                            <Button
                                variant="outline"
                                onClick={onBack}
                                className="gap-2 flex-1 transition-all duration-300 hover:shadow-md"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </Button>
                            <Button
                                onClick={() =>
                                    onNext({ firstName, lastName, email, userCode: code })
                                }
                                className="gap-2 flex-[2] bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]"
                                disabled={!allValid}
                            >
                                Continue
                                <motion.span
                                    animate={{ x: [0, 4, 0] }}
                                    transition={{
                                        repeat: Infinity,
                                        duration: 1.5,
                                        ease: "easeInOut",
                                    }}
                                >
                                    <ArrowRight className="w-4 h-4" />
                                </motion.span>
                            </Button>
                        </motion.div>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}
