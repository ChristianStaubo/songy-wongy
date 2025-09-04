import { get } from "@/lib/fetch";
import { UserMusicListResponse } from "@repo/types";

interface GetUserMusicParams {
  page?: number;
  limit?: number;
}

export const getUserMusic = async (
  params: GetUserMusicParams = {},
  token: string,
): Promise<UserMusicListResponse> => {
  const { page = 1, limit = 10 } = params;

  const response = await get<UserMusicListResponse>(`/music-generator/music`, {
    token,
    params: {
      page: page.toString(),
      limit: limit.toString(),
    },
  });

  if (response.error) {
    throw new Error(response.error);
  }

  if (!response.data) {
    throw new Error("No music data returned from API");
  }

  return response.data;
};
