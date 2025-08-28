export interface Song {
  id: number;
  title: string;
  prompt: string;
  thumbnail: string;
  audioUrl: string;
  createdAt: string;
}

export interface DashboardState {
  credits: number;
  songs: Song[];
  isGenerating: boolean;
}

export interface SongCreationData {
  prompt: string;
}
