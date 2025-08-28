"use client";

import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Dashboard, Song } from "@/features/dashboard";

export default function DashboardPage() {
  const { isSignedIn, user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  // Mock state for MVP
  const [credits, setCredits] = useState(5); // Mock user credits
  const [songs, setSongs] = useState<Song[]>([
    {
      id: 1,
      title: "Sunny Day Blues",
      prompt: "A happy song about sunshine",
      thumbnail: "/placeholder-song.jpg",
      audioUrl: "#",
      createdAt: "2024-01-15",
    },
    {
      id: 2,
      title: "Midnight Coding",
      prompt: "A song about coding late at night",
      thumbnail: "/placeholder-song.jpg",
      audioUrl: "#",
      createdAt: "2024-01-14",
    },
  ]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Redirect to home if not signed in
  if (!isSignedIn) {
    router.push("/");
    return null;
  }

  // Main dashboard for authenticated users
  return (
    <Dashboard
      credits={credits}
      songs={songs}
      userName={
        user.firstName || user.emailAddresses?.[0]?.emailAddress || "User"
      }
      onSignOut={() => signOut()}
    />
  );
}
