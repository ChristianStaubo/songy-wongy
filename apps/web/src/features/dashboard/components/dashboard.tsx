"use client";

import { DashboardNav } from "./dashboard-nav";
import { SongCreationForm } from "./song-creation-form";
import { SongLibrary } from "./song-library";
import { CreditsSection } from "./credits-section";
import { Song } from "../types/dashboard-types";

interface DashboardProps {
  credits: number;
  songs: Song[];
  songPrompt: string;
  setSongPrompt: (prompt: string) => void;
  isGenerating: boolean;
  userName: string;
  onSignOut: () => void;
  onGenerateSong: (e: React.FormEvent) => void;
  onPurchaseCredits: () => void;
  onDeleteSong: (songId: number) => void;
}

export function Dashboard({
  credits,
  songs,
  songPrompt,
  setSongPrompt,
  isGenerating,
  userName,
  onSignOut,
  onGenerateSong,
  onPurchaseCredits,
  onDeleteSong,
}: DashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav
        credits={credits}
        userName={userName}
        onSignOut={onSignOut}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Song Creation Section */}
          <div className="lg:col-span-2">
            <SongCreationForm
              songPrompt={songPrompt}
              setSongPrompt={setSongPrompt}
              credits={credits}
              isGenerating={isGenerating}
              onSubmit={onGenerateSong}
            />

            {/* Song Library */}
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Your Songs
              </h2>
              <SongLibrary songs={songs} onDeleteSong={onDeleteSong} />
            </div>
          </div>

          {/* Credits & Purchase Section */}
          <div className="lg:col-span-1">
            <CreditsSection
              credits={credits}
              songsCount={songs.length}
              onPurchaseCredits={onPurchaseCredits}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
