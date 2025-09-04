import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { MusicStatusResponse } from "@repo/types";
import { toast } from "sonner";
import { getMusicStatus } from "../api";

type ApiError = { message: string };

interface UseMusicStatusOptions {
  musicId: string;
  enabled?: boolean;
  onComplete?: (audioUrl: string) => void;
  onFailed?: () => void;
}

export const useMusicStatus = ({
  musicId,
  enabled = true,
  onComplete,
  onFailed,
}: UseMusicStatusOptions) => {
  const { getToken } = useAuth();

  return useQuery<MusicStatusResponse, ApiError>({
    queryKey: ["music-status", musicId],
    queryFn: async () => {
      // Get Clerk token with long-lived template
      const token = await getToken();

      if (!token) {
        throw new Error("User not authenticated.");
      }

      const result = await getMusicStatus(musicId, token);

      // Handle status changes
      if (result.status === "COMPLETED" && result.audioUrl) {
        toast.success("Music generation completed! 🎉");
        onComplete?.(result.audioUrl);
      } else if (result.status === "FAILED") {
        toast.error("Music generation failed. Please try again.");
        onFailed?.();
      }

      return result;
    },
    enabled: enabled && !!musicId,
    refetchInterval: (query) => {
      // Stop polling if completed or failed
      if (
        query.state.data?.status === "COMPLETED" ||
        query.state.data?.status === "FAILED"
      ) {
        return false;
      }
      // Poll every 3 seconds while generating
      return 3000;
    },
    refetchIntervalInBackground: false,
    retry: (failureCount, error) => {
      // Don't retry if it's an auth error
      if (error.message.includes("authenticated")) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
  });
};
