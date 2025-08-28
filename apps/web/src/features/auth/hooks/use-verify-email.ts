import { useMutation } from "@tanstack/react-query";
import { useSignUp } from "@clerk/nextjs";

export interface VerifyEmailDto {
  code: string;
}

export interface VerifyEmailResponse {
  status: "complete" | "missing_requirements";
  createdSessionId?: string | null;
  createdUserId?: string | null;
}

type VerifyEmailError = { message: string };

export const useVerifyEmail = () => {
  const { signUp, isLoaded } = useSignUp();

  return useMutation<VerifyEmailResponse, VerifyEmailError, VerifyEmailDto>({
    mutationFn: async (verificationData: VerifyEmailDto) => {
      if (!isLoaded || !signUp) {
        throw new Error("Clerk is not loaded");
      }

      try {
        const result = await signUp.attemptEmailAddressVerification({
          code: verificationData.code,
        });

        return {
          status: result.status === "complete" ? "complete" : "missing_requirements",
          createdSessionId: result.createdSessionId,
          createdUserId: result.createdUserId,
        };
      } catch (error: any) {
        throw new Error(error.errors?.[0]?.message || "Email verification failed");
      }
    },
    onError: (error) => {
      console.error("Email verification failed:", error);
    },
    onSuccess: (data: VerifyEmailResponse) => {
      console.log("Email verification successful:", data);
    },
  });
};

