import { Button } from "@/components/ui/button";

interface CreateSongFormSubmitButtonProps {
  credits: number;
  isGenerating: boolean;
  isPolling: boolean;
}

export function CreateSongFormSubmitButton({
  credits,
  isGenerating,
  isPolling,
}: CreateSongFormSubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={credits < 1 || isGenerating || isPolling}
      className="min-w-[120px] bg-red-600 hover:bg-red-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
    >
      {isGenerating ? (
        <span className="flex items-center gap-1">
          Starting
          <span className="flex">
            <span className="animate-bounce [animation-delay:0ms]">.</span>
            <span className="animate-bounce [animation-delay:150ms]">.</span>
            <span className="animate-bounce [animation-delay:300ms]">.</span>
          </span>
        </span>
      ) : isPolling ? (
        <span className="flex items-center gap-1">
          Generating
          <span className="flex">
            <span className="animate-bounce [animation-delay:0ms]">.</span>
            <span className="animate-bounce [animation-delay:150ms]">.</span>
            <span className="animate-bounce [animation-delay:300ms]">.</span>
          </span>
        </span>
      ) : (
        "Create Song"
      )}
    </Button>
  );
}
