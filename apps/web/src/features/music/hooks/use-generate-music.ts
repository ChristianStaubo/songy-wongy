import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { MusicBufferResponse, GenerateMusicDto } from '@repo/types';
import { generateMusic } from '../api/generate-music';
import { toast } from "sonner"
type ApiError = { message: string };

export const useGenerateMusic = () => {
  const { getToken } = useAuth();

  return useMutation<MusicBufferResponse, ApiError, GenerateMusicDto>({
    mutationFn: async (musicData: GenerateMusicDto) => {
      // Get Clerk token with long-lived template
      const token = await getToken({ template: 'long_lived' });
      
      if (!token) {
        throw new Error('User not authenticated.');
      }

      // Call the API function - it now returns the raw data, not ApiResponse wrapper
      const result = await generateMusic(musicData, token);
      return result;
    },
    onError: (error) => {
      console.error('Music generation failed:', error);
      toast.error(error.message || 'Failed to generate music. Please try again.');
    },
    onSuccess: (data: MusicBufferResponse) => {
      console.log('Music generation successful', data);
      toast.success('Music generated successfully! 🎵');
    },
  });
};
