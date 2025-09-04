import { get, post } from "@/lib/fetch";
import {
  GenerateMusicDto,
  MusicBufferResponse,
  MusicGenerationRequestResponse,
  MusicStatusResponse,
  MusicDownloadResponse,
} from "@repo/types";

export const generateMusic = async (
  data: GenerateMusicDto,
  token: string,
): Promise<MusicGenerationRequestResponse> => {
  const response = await post<MusicGenerationRequestResponse, GenerateMusicDto>(
    "/music-generator/generate",
    data,
    {
      token,
    },
  );

  if (response.error) {
    throw new Error(response.error);
  }

  if (!response.data) {
    throw new Error("No data returned from API");
  }

  return response.data;
};
