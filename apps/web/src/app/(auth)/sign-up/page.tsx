"use client";

import * as React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  signUpSchema,
  verifyEmailSchema,
  SignUpFormData,
  VerifyEmailFormData,
} from "@/features/auth/schemas/sign-up-schema";

export default function Page() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [verifying, setVerifying] = React.useState(false);
  const [userEmail, setUserEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const router = useRouter();

  // Sign-up form
  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
  });

  // Verification form
  const verifyForm = useForm<VerifyEmailFormData>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      code: "",
    },
  });

  // Handle submission of the sign-up form
  const onSignUpSubmit: SubmitHandler<SignUpFormData> = async (formData) => {
    if (!isLoaded) return;

    setIsLoading(true);
    setError("");
    setUserEmail(formData.email);

    // Start the sign-up process using the email and password provided
    try {
      await signUp.create({
        emailAddress: formData.email,
        password: formData.password,
        // Store firstName and lastName in unsafeMetadata so they're available in webhooks
        unsafeMetadata: {
          firstName: formData.firstName,
          lastName: formData.lastName,
        },
      });

      // Send the user an email with the verification code
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      // Set 'verifying' true to display second form
      // and capture the OTP code
      setVerifying(true);
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.message || "An error occurred during sign up");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle the submission of the verification form
  const onVerifySubmit: SubmitHandler<VerifyEmailFormData> = async (
    formData
  ) => {
    if (!isLoaded) return;

    setIsLoading(true);
    setError("");

    try {
      // Use the code the user provided to attempt verification
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: formData.code,
      });

      if (completeSignUp.status === "complete") {
        await setActive({
          session: completeSignUp.createdSessionId,
          navigate: async ({ session }) => {
            if (session?.currentTask) {
              console.log(session?.currentTask);
              return;
            }

            await router.push("/dashboard");
          },
        });
      } else {
        console.error(JSON.stringify(completeSignUp, null, 2));
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      setError(err.errors?.[0]?.message || "Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Verify your email</CardTitle>
              <CardDescription>
                We sent a verification code to {userEmail}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={verifyForm.handleSubmit(onVerifySubmit)}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="code">Verification code</Label>
                    <Input
                      id="code"
                      type="text"
                      placeholder="Enter your verification code"
                      {...verifyForm.register("code")}
                      disabled={isLoading}
                    />
                    {verifyForm.formState.errors.code && (
                      <p className="text-sm text-red-600">
                        {verifyForm.formState.errors.code.message}
                      </p>
                    )}
                  </div>

                  {error && <p className="text-sm text-red-600">{error}</p>}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Verifying..." : "Verify Email"}
                  </Button>

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setVerifying(false);
                        setError("");
                        verifyForm.reset();
                      }}
                      disabled={isLoading}
                    >
                      Back to sign up
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>
              Enter your information below to create your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={signUpForm.handleSubmit(onSignUpSubmit)}>
              <div className="flex flex-col gap-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      {...signUpForm.register("firstName")}
                      disabled={isLoading}
                    />
                    {signUpForm.formState.errors.firstName && (
                      <p className="text-sm text-red-600">
                        {signUpForm.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      {...signUpForm.register("lastName")}
                      disabled={isLoading}
                    />
                    {signUpForm.formState.errors.lastName && (
                      <p className="text-sm text-red-600">
                        {signUpForm.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    {...signUpForm.register("email")}
                    disabled={isLoading}
                  />
                  {signUpForm.formState.errors.email && (
                    <p className="text-sm text-red-600">
                      {signUpForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password"
                    {...signUpForm.register("password")}
                    disabled={isLoading}
                  />
                  {signUpForm.formState.errors.password && (
                    <p className="text-sm text-red-600">
                      {signUpForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {/* CAPTCHA Widget */}
                <div id="clerk-captcha"></div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </div>

              <div className="mt-4 text-center text-sm">
                Already have an account?{" "}
                <a href="/sign-in" className="underline underline-offset-4">
                  Sign in
                </a>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
