import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { UserMusicListResponse } from "@repo/types";
import { getUserMusic } from "../api";
import { toast } from "sonner";

type ApiError = { message: string };

interface UseGetUsersMusicOptions {
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export const useGetUsersMusic = ({
  page = 1,
  limit = 10,
  enabled = true,
}: UseGetUsersMusicOptions = {}) => {
  const { getToken } = useAuth();

  return useQuery<UserMusicListResponse, ApiError>({
    queryKey: ["user-music", page, limit],
    queryFn: async () => {
      // Get Clerk token with long-lived template
      const token = await getToken({ template: "long_lived" });

      if (!token) {
        throw new Error("User not authenticated.");
      }

      const result = await getUserMusic({ page, limit }, token);
      return result;
    },
    enabled: enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
