"use client";

import { Button } from "@/components/ui/button";

interface DashboardNavProps {
  credits: number;
  userName: string;
  onSignOut: () => void;
}

export function DashboardNav({
  credits,
  userName,
  onSignOut,
}: DashboardNavProps) {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="text-2xl font-bold text-red-600">🎵 Songy Wongy</div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-red-100 px-3 py-1 rounded-full">
              <span className="text-red-600 font-semibold">
                💎 {credits} credits
              </span>
            </div>
            <span className="text-sm text-gray-600">Welcome, {userName}!</span>
            <Button onClick={onSignOut} variant="outline" size="sm">
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
