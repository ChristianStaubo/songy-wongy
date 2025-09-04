import { useState, useCallback } from "react";
import { GenerateMusicDto, MusicStatus } from "@repo/types";
import { useGenerateMusic } from "./use-generate-music";
import { useMusicStatus } from "./use-music-status";
import { useAuth } from "@clerk/nextjs";
import { getMusicDownloadUrl } from "../api";

interface UseMusicGenerationFlowReturn {
  // Generation state
  startGeneration: (data: GenerateMusicDto) => void;
  isGenerating: boolean;

  // Polling state
  isPolling: boolean;
  status: "idle" | MusicStatus;
  progress: {
    musicId?: string;
    name?: string;
    audioUrl?: string;
    downloadUrl?: string;
    fileName?: string;
  };

  // Actions
  reset: () => void;
}

export const useMusicGenerationFlow = (): UseMusicGenerationFlowReturn => {
  const [musicId, setMusicId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | MusicStatus>("idle");
  const [musicName, setMusicName] = useState<string>("");

  // Generation mutation
  const generateMutation = useGenerateMusic();
  const { getToken } = useAuth();

  // Status polling query
  const statusQuery = useMusicStatus({
    musicId: musicId || "",
    enabled: !!musicId && status === "GENERATING",
    onComplete: useCallback(
      async (url: string) => {
        setAudioUrl(url);
        setStatus("COMPLETED");

        // Fetch the download URL when music is completed
        try {
          const token = await getToken({ template: "long_lived" });
          if (token && musicId) {
            const downloadData = await getMusicDownloadUrl(musicId, token);
            setDownloadUrl(downloadData.downloadUrl);
            setFileName(downloadData.fileName);
          }
        } catch (error) {
          console.error("Failed to fetch download URL:", error);
          // Don't fail the whole flow if download URL fails
        }
      },
      [getToken, musicId],
    ),
    onFailed: useCallback(() => {
      setStatus("FAILED");
    }, []),
  });

  // Start generation function
  const startGeneration = useCallback(
    (data: GenerateMusicDto) => {
      setStatus("GENERATING");
      setMusicName(data.name);
      setAudioUrl(null);
      setDownloadUrl(null);
      setFileName(null);

      generateMutation.mutate(data, {
        onSuccess: (response) => {
          setMusicId(response.musicId);
          // Status will remain 'GENERATING' until polling completes
        },
        onError: () => {
          setStatus("FAILED");
        },
      });
    },
    [generateMutation],
  );

  // Reset function
  const reset = useCallback(() => {
    setMusicId(null);
    setAudioUrl(null);
    setDownloadUrl(null);
    setFileName(null);
    setStatus("idle");
    setMusicName("");
    generateMutation.reset();
  }, [generateMutation]);

  return {
    startGeneration,
    isGenerating: generateMutation.isPending,
    isPolling: !!musicId && status === "GENERATING",
    status,
    progress: {
      musicId: musicId || undefined,
      name: musicName || undefined,
      audioUrl: audioUrl || undefined,
      downloadUrl: downloadUrl || undefined,
      fileName: fileName || undefined,
    },
    reset,
  };
};
