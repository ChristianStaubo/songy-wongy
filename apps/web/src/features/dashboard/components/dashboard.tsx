"use client";

import { SongCreationForm } from "./song-creation-form";
import { SongLibrary } from "./song-library";
import { CreditsSection } from "./credits-section";
import { Song } from "../types/dashboard-types";
import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

interface DashboardProps {
  credits: number;
  songs: Song[];
}

export function Dashboard({ credits, songs }: DashboardProps) {
  const { getToken } = useAuth();

  // useEffect(() => {
  //   const fetchToken = async () => {
  //     try {
  //       // Get a long-lived token using the "long_lived" template
  //       const token = await getToken({ template: "long_lived" });
  //       console.log("Long-lived token:", token);
  //     } catch (error) {
  //       console.error("Error getting token:", error);
  //     }
  //   };

  //   fetchToken();
  // }, [getToken]); // Add getToken to dependency array
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Song Creation Section */}
      <div className="lg:col-span-2">
        <SongCreationForm credits={credits} />

        {/* Song Library */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Songs</h2>
          <SongLibrary songs={songs} />
        </div>
      </div>

      {/* Credits & Purchase Section */}
      <div className="lg:col-span-1">
        <CreditsSection credits={credits} songsCount={songs.length} />
      </div>
    </div>
  );
}
