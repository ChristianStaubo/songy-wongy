import { post } from '@/lib/fetch';
import { GenerateMusicDto, MusicBufferResponse } from '@repo/types';

export const generateMusic = async (data: GenerateMusicDto, token: string): Promise<MusicBufferResponse> => {
  const response = await post<MusicBufferResponse, GenerateMusicDto>(
    "/music-generator/generate",
    data,
    {
      token,
    }
  );

  if (response.error) {
    throw new Error(response.error);
  }

  if (!response.data) {
    throw new Error('No data returned from API');
  }

  return response.data;
};
