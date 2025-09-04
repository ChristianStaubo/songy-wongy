import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { MusicGenerationRequestResponse, GenerateMusicDto } from "@repo/types";
import { generateMusic } from "../api/generate-music";
import { toast } from "sonner";
type ApiError = { message: string };

export const useGenerateMusic = () => {
  const { getToken } = useAuth();

  return useMutation<
    MusicGenerationRequestResponse,
    ApiError,
    GenerateMusicDto
  >({
    mutationFn: async (musicData: GenerateMusicDto) => {
      // Get Clerk token
      const token = await getToken();

      if (!token) {
        throw new Error("User not authenticated.");
      }

      // Call the API function - it now returns the async generation response
      const result = await generateMusic(musicData, token);
      return result;
    },
    onError: (error) => {
      console.error("Music generation failed:", error);
      toast.error(
        error.message || "Failed to start music generation. Please try again.",
      );
    },
    onSuccess: (data: MusicGenerationRequestResponse) => {
      console.log("Music generation started", data);
      toast.success("Music generating...");
    },
  });
};
