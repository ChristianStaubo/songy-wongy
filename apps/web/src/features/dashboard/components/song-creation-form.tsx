"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GenerateMusicDto, generateMusicDto } from "@repo/types";
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
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useGenerateMusic } from "../../music/hooks/use-generate-music";
import { useState } from "react";

interface SongCreationFormProps {
  credits: number;
}

// Use the shared DTO type from @repo/types
type FormData = GenerateMusicDto;

export function SongCreationForm({ credits }: SongCreationFormProps) {
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(generateMusicDto),
    defaultValues: {
      name: "",
      prompt: "",
      lengthMs: 30000, // 30 seconds default
    },
  });

  const { mutate: generateMusic, isPending: isGenerating } = useGenerateMusic();

  // Watch lengthMs for the slider
  const lengthMs = watch("lengthMs") || 30000;

  const onSubmit: SubmitHandler<FormData> = (formData) => {
    generateMusic(formData, {
      onSuccess: (response) => {
        console.log("Music generated successfully:", response);

        // Convert base64 to audio URL for playback
        const audioBlob = new Blob(
          [Uint8Array.from(atob(response.audioBase64), (c) => c.charCodeAt(0))],
          { type: "audio/mpeg" }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        setGeneratedAudio(audioUrl);

        // Reset form after successful generation
        reset();
      },
      onError: (error) => {
        console.error("Component onError callback:", error);
        // Hook already shows error toast
      },
    });
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.round(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎵 Create a New Song
        </CardTitle>
        <CardDescription>
          Describe the song you want and our AI will create it for you!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Song Name Field */}
          <div>
            <Label htmlFor="name">Song Name</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="e.g., Summer Vibes"
              className="mt-1"
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Song Description/Prompt Field */}
          <div>
            <Label htmlFor="prompt">Song Description</Label>
            <Textarea
              id="prompt"
              {...register("prompt")}
              placeholder="e.g., A happy pop song about summer vacation with upbeat drums and catchy melodies"
              className="mt-1 min-h-[100px]"
            />
            {errors.prompt && (
              <p className="text-sm text-red-600 mt-1">
                {errors.prompt.message}
              </p>
            )}
          </div>

          {/* Length Slider */}
          <div>
            <Label htmlFor="lengthMs">
              Song Length: {formatDuration(lengthMs)}
            </Label>
            <div className="mt-2">
              <Slider
                value={[lengthMs]}
                onValueChange={(value) => setValue("lengthMs", value[0])}
                min={10000}
                max={300000}
                step={5000}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10s</span>
                <span>5min</span>
              </div>
            </div>
            {errors.lengthMs && (
              <p className="text-sm text-red-600 mt-1">
                {errors.lengthMs.message}
              </p>
            )}
          </div>

          {/* Generated Audio Player */}
          {generatedAudio && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <Label className="text-green-800 font-medium">
                🎵 Your Generated Song:
              </Label>
              <audio controls className="w-full mt-2">
                <source src={generatedAudio} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {/* Submit Section */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              Cost: 1 credit • You have {credits} credits
            </div>
            <Button
              type="submit"
              disabled={credits < 1 || isGenerating}
              className="min-w-[120px] bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {isGenerating ? "Generating..." : "Create Song"}
            </Button>
          </div>

          {credits < 1 && (
            <div className="text-sm text-red-600">
              You need credits to create songs. Purchase more below!
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
