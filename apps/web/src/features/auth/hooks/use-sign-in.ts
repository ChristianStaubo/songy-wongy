import { useMutation } from "@tanstack/react-query";
import { useSignIn as useClerkSignIn } from "@clerk/nextjs";

export interface SignInDto {
  email: string;
  password: string;
}

export interface SignInResponse {
  status: "complete" | "needs_verification";
  createdSessionId?: string | null;
}

type SignInError = { message: string };

export const useSignIn = () => {
  const { signIn, isLoaded } = useClerkSignIn();

  return useMutation<SignInResponse, SignInError, SignInDto>({
    mutationFn: async (userData: SignInDto) => {
      if (!isLoaded || !signIn) {
        throw new Error("Clerk is not loaded");
      }

      try {
        const result = await signIn.create({
          identifier: userData.email,
          password: userData.password,
        });

        return {
          status: result.status === "complete" ? "complete" : "needs_verification",
          createdSessionId: result.createdSessionId,
        };
      } catch (error: any) {
        throw new Error(error.errors?.[0]?.message || "Sign in failed");
      }
    },
    onError: (error) => {
      console.error("Sign in failed:", error);  
    },
    onSuccess: (data: SignInResponse) => {
      console.log("Sign in successful:", data);
    },
  });
};

