"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Mic, Bell, Users, User, Calendar, Keyboard, Settings as SettingsIcon } from "lucide-react";

interface SettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type SettingsTab = "audio" | "video" | "notifications" | "admin" | "profile" | "calendar" | "shortcuts" | "more";

export default function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<SettingsTab>("audio");

    const tabs = [
        { id: "audio" as const, label: "Âm thanh", icon: Mic },
        { id: "video" as const, label: "Hình ảnh", icon: Video },
        { id: "notifications" as const, label: "Thông báo", icon: Bell },
        { id: "admin" as const, label: "Quản trị viên", icon: Users },
        { id: "profile" as const, label: "Hồ sơ", icon: User },
        { id: "calendar" as const, label: "Lịch", icon: Calendar },
        { id: "shortcuts" as const, label: "Phím tắt", icon: Keyboard },
        { id: "more" as const, label: "Thêm", icon: SettingsIcon },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[85vh] p-0 overflow-hidden">
                <div className="flex h-full">
                    {/* Sidebar */}
                    <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col">
                        <DialogHeader className="px-6 py-6 border-b border-gray-200">
                            <DialogTitle className="text-xl">Cài đặt</DialogTitle>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto py-4">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full px-6 py-3 flex items-center gap-3 transition-colors ${activeTab === tab.id
                                                ? "bg-white text-[hsl(210,100%,60%)] border-l-4 border-[hsl(210,100%,60%)]"
                                                : "text-gray-700 hover:bg-white/50"
                                            }`}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span className="text-sm font-medium">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col">
                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTab === "audio" && <AudioSettings />}
                            {activeTab === "video" && <VideoSettings />}
                            {activeTab === "notifications" && <NotificationsSettings />}
                            {activeTab === "admin" && <AdminSettings />}
                            {activeTab === "profile" && <ProfileSettings />}
                            {activeTab === "calendar" && <CalendarSettings />}
                            {activeTab === "shortcuts" && <ShortcutsSettings />}
                            {activeTab === "more" && <MoreSettings />}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
                            <Button
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                                className="rounded-lg"
                            >
                                Hủy
                            </Button>
                            <Button
                                onClick={() => onOpenChange(false)}
                                className="bg-[hsl(210,100%,60%)] hover:bg-[hsl(210,100%,55%)] text-white rounded-lg"
                            >
                                Lưu
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Audio Settings Tab
function AudioSettings() {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Âm thanh</h3>

                {/* Microphone */}
                <div className="space-y-2 mb-4">
                    <Label className="text-sm font-medium text-gray-700">Microphone</Label>
                    <Select>
                        <SelectTrigger className="rounded-xl border-gray-200">
                            <SelectValue placeholder="Microphone Array (Intel® Smart Sound Technology)" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="default">Microphone Array (Intel® Smart Sound Technology)</SelectItem>
                            <SelectItem value="system">Default Microphone (System)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Noise Suppression */}
                <div className="flex items-center justify-between py-3 mb-4">
                    <Label className="text-sm font-medium text-gray-700">Khử tiếng ồn</Label>
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-[hsl(210,100%,60%)] focus:ring-[hsl(210,100%,60%)]" />
                </div>

                {/* Speaker */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-700">Loa / Tai nghe</Label>
                        <Button size="sm" variant="outline" className="rounded-lg">
                            Phát thử
                        </Button>
                    </div>
                    <Select>
                        <SelectTrigger className="rounded-xl border-gray-200">
                            <SelectValue placeholder="Headphones (Realtek Audio)" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="default">Headphones (Realtek Audio)</SelectItem>
                            <SelectItem value="speakers">Speakers (Built-in)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}

// Video Settings Tab
function VideoSettings() {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Video</h3>

                {/* Camera */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Camera</Label>
                    <Select>
                        <SelectTrigger className="rounded-xl border-gray-200">
                            <SelectValue placeholder="Integrated Camera" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="integrated">Integrated Camera</SelectItem>
                            <SelectItem value="usb">External USB Camera</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}

// Placeholder components for other tabs
function NotificationsSettings() {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Thông báo</h3>
            <p className="text-sm text-gray-600">Cài đặt thông báo sẽ được thêm vào đây.</p>
        </div>
    );
}

function AdminSettings() {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Quản trị viên</h3>
            <p className="text-sm text-gray-600">Cài đặt quản trị viên sẽ được thêm vào đây.</p>
        </div>
    );
}

function ProfileSettings() {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Hồ sơ</h3>
            <p className="text-sm text-gray-600">Cài đặt hồ sơ sẽ được thêm vào đây.</p>
        </div>
    );
}

function CalendarSettings() {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Lịch</h3>
            <p className="text-sm text-gray-600">Cài đặt lịch sẽ được thêm vào đây.</p>
        </div>
    );
}

function ShortcutsSettings() {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Phím tắt</h3>
            <p className="text-sm text-gray-600">Cài đặt phím tắt sẽ được thêm vào đây.</p>
        </div>
    );
}

function MoreSettings() {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Thêm</h3>
            <p className="text-sm text-gray-600">Các cài đặt khác sẽ được thêm vào đây.</p>
        </div>
    );
}
