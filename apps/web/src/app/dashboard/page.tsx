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
  const [songPrompt, setSongPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
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

  // Handler functions for MVP functionality
  const handleGenerateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songPrompt.trim() || credits < 1) return;

    setIsGenerating(true);
    // Mock API call - replace with actual API call later
    setTimeout(() => {
      const newSong = {
        id: songs.length + 1,
        title: `Song about ${songPrompt.slice(0, 20)}...`,
        prompt: songPrompt,
        thumbnail: "/placeholder-song.jpg",
        audioUrl: "#",
        createdAt: new Date().toISOString().split("T")[0] || "",
      };
      setSongs([newSong, ...songs]);
      setCredits(credits - 1);
      setSongPrompt("");
      setIsGenerating(false);
    }, 2000);
  };

  const handlePurchaseCredits = () => {
    // Mock credit purchase - replace with Stripe integration later
    setCredits(credits + 10);
    alert("🎉 10 credits added! (This is a mock purchase)");
  };

  const handleDeleteSong = (songId: number) => {
    setSongs(songs.filter((song) => song.id !== songId));
  };

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
      songPrompt={songPrompt}
      setSongPrompt={setSongPrompt}
      isGenerating={isGenerating}
      userName={
        user.firstName || user.emailAddresses?.[0]?.emailAddress || "User"
      }
      onSignOut={() => signOut()}
      onGenerateSong={handleGenerateSong}
      onPurchaseCredits={handlePurchaseCredits}
      onDeleteSong={handleDeleteSong}
    />
  );
}
