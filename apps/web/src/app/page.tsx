"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Marketing landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50">
      <nav className="w-full flex justify-between items-center p-6">
        <div className="text-2xl font-bold text-red-600">🎵 Songy Wongy</div>
        <div className="flex gap-4 items-center">
          <a
            href="/sign-in"
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Sign In
          </a>
          <a
            href="/sign-up"
            className="px-4 py-2 text-sm border border-red-600 text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            Sign Up
          </a>
        </div>
      </nav>

      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Create Amazing Songs with AI 🎵
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl">
          Turn your ideas into music! Just describe what you want and our AI
          will generate a complete song with lyrics and audio.
        </p>
        <div className="flex gap-4">
          <a
            href="/sign-up"
            className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            Get Started Free
          </a>
          <a
            href="/sign-in"
            className="px-8 py-3 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-semibold"
          >
            Sign In
          </a>
        </div>

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
          <div className="text-center">
            <div className="text-4xl mb-4">🎤</div>
            <h3 className="text-xl font-semibold mb-2">AI-Powered Creation</h3>
            <p className="text-gray-600">
              Just describe your song idea and watch our AI bring it to life
              with lyrics and melody.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
            <p className="text-gray-600">
              Get your complete song in seconds, not hours. Perfect for quick
              inspiration or professional projects.
            </p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">💎</div>
            <h3 className="text-xl font-semibold mb-2">Credit System</h3>
            <p className="text-gray-600">
              Pay only for what you create. 1 credit = 1 song. No subscriptions,
              no hidden fees.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
