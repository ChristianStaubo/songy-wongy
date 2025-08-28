"use client";

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

interface SongCreationFormProps {
  songPrompt: string;
  setSongPrompt: (prompt: string) => void;
  credits: number;
  isGenerating: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function SongCreationForm({
  songPrompt,
  setSongPrompt,
  credits,
  isGenerating,
  onSubmit,
}: SongCreationFormProps) {
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
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="prompt">Song Description</Label>
            <Input
              id="prompt"
              placeholder="e.g., A happy pop song about summer vacation"
              value={songPrompt}
              onChange={(e) => setSongPrompt(e.target.value)}
              disabled={isGenerating}
              className="mt-1"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Cost: 1 credit • You have {credits} credits
            </div>
            <Button
              type="submit"
              disabled={isGenerating || credits < 1 || !songPrompt.trim()}
              className="min-w-[120px] bg-red-600 hover:bg-red-700"
            >
              {isGenerating ? "Creating..." : "Create Song"}
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
