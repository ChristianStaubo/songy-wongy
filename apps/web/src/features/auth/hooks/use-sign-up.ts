import { useMutation } from "@tanstack/react-query";
import { useSignUp as useClerkSignUp } from "@clerk/nextjs";

export interface SignUpDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface SignUpResponse {
  status: "complete" | "missing_requirements";
  createdSessionId?: string | null;
  createdUserId?: string | null;
}

type SignUpError = { message: string };

export const useSignUp = () => {
  const { signUp, isLoaded } = useClerkSignUp();

  return useMutation<SignUpResponse, SignUpError, SignUpDto>({
    mutationFn: async (userData: SignUpDto) => {
      if (!isLoaded || !signUp) {
        throw new Error("Clerk is not loaded");
      }

      try {
        const result = await signUp.create({
          emailAddress: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
        });

        // Prepare the email address verification
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

        return {
          status: result.status === "complete" ? "complete" : "missing_requirements",
          createdSessionId: result.createdSessionId,
          createdUserId: result.createdUserId,
        };
      } catch (error: any) {
        throw new Error(error.errors?.[0]?.message || "Sign up failed");
      }
    },
    onError: (error) => {
      console.error("Sign up failed:", error);
    },
    onSuccess: (data: SignUpResponse) => {
      console.log("Sign up successful:", data);
    },
  });
};

