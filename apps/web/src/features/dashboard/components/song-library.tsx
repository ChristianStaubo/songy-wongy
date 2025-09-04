"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Song } from "../types/dashboard-types";

interface SongLibraryProps {
  songs: Song[];
}

export function SongLibrary({ songs }: SongLibraryProps) {
  if (songs.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🎵</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No songs yet
          </h3>
          <p className="text-gray-600">
            Create your first song using the form above!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {songs.map((song) => (
        <Card key={song.id} className="overflow-hidden">
          <div className="aspect-video bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center">
            <div className="text-white text-4xl">🎵</div>
          </div>
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg mb-2">{song.name}</h3>
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {song.prompt}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
              <span>
                Created: {new Date(song.createdAt).toLocaleDateString()}
              </span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  song.status === "COMPLETED"
                    ? "bg-green-100 text-green-700"
                    : song.status === "GENERATING"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {song.status}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={song.status !== "COMPLETED"}
                className="flex-1 hover:bg-red-50 hover:border-red-200 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                ▶️ Play
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={song.status !== "COMPLETED"}
                className="flex-1 hover:bg-red-50 hover:border-red-200 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                ⬇️ Download
              </Button>
              <Button size="sm" variant="outline" className="cursor-pointer">
                🗑️
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
