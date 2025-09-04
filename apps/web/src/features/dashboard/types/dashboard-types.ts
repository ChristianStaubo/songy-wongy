import { UserMusicListResponse } from "@repo/types";

// Use the music item type from the API response
export type Song = UserMusicListResponse["music"][0];

export interface DashboardState {
  credits: number;
  songs: Song[];
  isGenerating: boolean;
}

export interface SongCreationData {
  prompt: string;
}
