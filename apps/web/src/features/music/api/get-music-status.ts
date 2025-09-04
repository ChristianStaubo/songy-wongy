import { get } from "@/lib/fetch";
import { MusicStatusResponse } from "@repo/types";

export const getMusicStatus = async (
  musicId: string,
  token: string,
): Promise<MusicStatusResponse> => {
  const response = await get<MusicStatusResponse>(
    `/music-generator/status/${musicId}`,
    {
      token,
    },
  );

  if (response.error) {
    throw new Error(response.error);
  }

  if (!response.data) {
    throw new Error("No status data returned from API");
  }

  return response.data;
};
