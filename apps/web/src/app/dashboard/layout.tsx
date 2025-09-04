"use client";

import { Button } from "@/components/ui/button";
import { useAuth, useUser } from "@clerk/nextjs";
import { useState } from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { signOut } = useAuth();
  const { user } = useUser();

  // Mock credits for now - you can replace this with actual credits fetching logic
  const [credits] = useState(5); // TODO: Fetch from API or user metadata

  const handleSignOut = () => {
    signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="text-2xl font-bold text-red-600">
              🎵 Songy Wongy
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-red-100 px-3 py-1 rounded-full">
                <span className="text-red-600 font-semibold">
                  💎 {credits} credits
                </span>
              </div>
              <span className="text-sm text-gray-600">
                Welcome, {user?.firstName || user?.username || "User"}!
              </span>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
