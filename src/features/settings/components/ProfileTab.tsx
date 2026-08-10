import { useRef, useState } from "react";

import { FaGithub } from "react-icons/fa";
import { Camera } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

import { UserProfile } from "../types";

interface ProfileTabProps {
    user: UserProfile;
    updateUser: (field: keyof UserProfile, value: any) => void;
}

export function ProfileTab({ user, updateUser }: ProfileTabProps) {
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setAvatarPreview(result);
                updateUser("avatar", result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveAvatar = () => {
        setAvatarPreview(null);
        updateUser("avatar", null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="space-y-6">
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b bg-muted/30">
                    <h2 className="text-sm font-semibold">Profile Information</h2>
                    <p className="text-[11px] text-muted-foreground">
                        Your personal information and social links
                    </p>
                </div>
                <div className="p-5 space-y-5">
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <Avatar className="w-20 h-20 rounded-2xl border-2 border-amber-500/30">
                                <AvatarImage src={avatarPreview || undefined} />
                                <AvatarFallback className="text-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                                    {user.firstName?.[0]}
                                    {user.lastName?.[0]}
                                </AvatarFallback>
                            </Avatar>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -bottom-1 -right-1 p-1 rounded-full bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                            >
                                <Camera className="w-3 h-3" />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                className="hidden"
                            />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Profile Picture</p>
                            <p className="text-[11px] text-muted-foreground">
                                PNG, JPG or GIF. Max 2MB.
                            </p>
                            {avatarPreview && (
                                <button
                                    onClick={handleRemoveAvatar}
                                    className="text-[11px] text-red-500 hover:text-red-600"
                                >
                                    Remove avatar
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs">First Name</Label>
                            <Input
                                value={user.firstName}
                                onChange={(e) => updateUser("firstName", e.target.value)}
                                className="h-8 text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Last Name</Label>
                            <Input
                                value={user.lastName}
                                onChange={(e) => updateUser("lastName", e.target.value)}
                                className="h-8 text-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Email Address</Label>
                            <Input
                                type="email"
                                value={user.email}
                                onChange={(e) => updateUser("email", e.target.value)}
                                className="h-8 text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Username</Label>
                            <Input
                                value={user.username}
                                onChange={(e) => updateUser("username", e.target.value)}
                                className="h-8 text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs">Bio</Label>
                        <textarea
                            value={user.bio}
                            onChange={(e) => updateUser("bio", e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Company</Label>
                            <Input
                                value={user.company}
                                onChange={(e) => updateUser("company", e.target.value)}
                                className="h-8 text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Website</Label>
                            <Input
                                value={user.website}
                                onChange={(e) => updateUser("website", e.target.value)}
                                className="h-8 text-sm"
                            />
                        </div>
                    </div>

                    <Separator />

                    <div>
                        <h3 className="text-sm font-medium mb-3">Social Links</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs flex items-center gap-1">
                                    <FaGithub className="w-3 h-3" />
                                    GitHub
                                </Label>
                                <Input
                                    value={user.github}
                                    onChange={(e) => updateUser("github", e.target.value)}
                                    placeholder="username"
                                    className="h-8 text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b bg-muted/30">
                    <h2 className="text-sm font-semibold">Notifications</h2>
                </div>
                <div className="divide-y">
                    <div className="flex items-center justify-between p-4">
                        <div>
                            <div className="text-sm font-medium">Email Notifications</div>
                            <div className="text-[11px] text-muted-foreground">
                                Receive updates via email
                            </div>
                        </div>
                        <Switch
                            checked={user.emailNotifications}
                            onCheckedChange={(v) => updateUser("emailNotifications", v)}
                        />
                    </div>
                    <div className="flex items-center justify-between p-4">
                        <div>
                            <div className="text-sm font-medium">Desktop Notifications</div>
                            <div className="text-[11px] text-muted-foreground">
                                Show notifications on your desktop
                            </div>
                        </div>
                        <Switch
                            checked={user.desktopNotifications}
                            onCheckedChange={(v) => updateUser("desktopNotifications", v)}
                        />
                    </div>
                    <div className="flex items-center justify-between p-4">
                        <div>
                            <div className="text-sm font-medium">Sound Effects</div>
                            <div className="text-[11px] text-muted-foreground">
                                Play sounds for certain events
                            </div>
                        </div>
                        <Switch
                            checked={user.soundEffects}
                            onCheckedChange={(v) => updateUser("soundEffects", v)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
