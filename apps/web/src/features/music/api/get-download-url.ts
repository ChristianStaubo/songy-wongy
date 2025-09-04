import { get } from "@/lib/fetch";
import { MusicDownloadResponse } from "@repo/types";

export const getMusicDownloadUrl = async (
  musicId: string,
  token: string,
): Promise<MusicDownloadResponse> => {
  const response = await get<MusicDownloadResponse>(
    `/music-generator/download/${musicId}`,
    {
      token,
    },
  );

  if (response.error) {
    throw new Error(response.error);
  }

  if (!response.data) {
    throw new Error("No download data returned from API");
  }

  return response.data;
};
