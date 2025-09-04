"use client";

import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Dashboard, Song, DashboardLoading } from "@/features/dashboard";
import { useGetUsersMusic } from "@/features/music/hooks";
import { UserMusicListResponse } from "@repo/types";
import { toast } from "sonner";

export default function DashboardPage() {
  const { isSignedIn, user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  // Mock state for MVP
  const [credits, setCredits] = useState(5); // Mock user credits

  // Fetch user's music using React Query
  const {
    data: musicData,
    isLoading: isMusicLoading,
    error: musicError,
  } = useGetUsersMusic({
    page: 1,
    limit: 20, // Get more songs for better UX
    enabled: isSignedIn && isLoaded,
  });

  console.log("Music data:", musicData); // Debug log to check structure

  if (!isLoaded || isMusicLoading) {
    return <DashboardLoading />;
  }

  // Redirect to home if not signed in
  if (!isSignedIn) {
    router.push("/");
    return null;
  }

  // Handle music loading error
  if (musicError) {
    console.error("Music loading error:", musicError);
    // Show toast error notification
    toast.error(musicError.message || "Failed to load your music library.");
  }

  // Extract songs from API response
  const songs: Song[] = (musicData as UserMusicListResponse)?.music || [];

  // Main dashboard for authenticated users
  return <Dashboard credits={credits} songs={songs} />;
}
