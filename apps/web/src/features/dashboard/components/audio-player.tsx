import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface AudioPlayerProps {
  downloadUrl: string;
  fileName?: string;
  onCreateAnother: () => void;
}

export function AudioPlayer({
  downloadUrl,
  fileName,
  onCreateAnother,
}: AudioPlayerProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(true);

  const handleDownload = async () => {
    setIsDownloading(true);

    try {
      toast.loading("Preparing download...", { id: "download" });

      // Use fetch to download the file properly
      const response = await fetch(downloadUrl);

      if (!response.ok) {
        throw new Error(
          `Download failed: ${response.status} ${response.statusText}`,
        );
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || "music.mp3";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Download completed! 🎵", { id: "download" });
    } catch (error) {
      console.error("Download failed:", error);

      // Show error toast
      toast.error("Download failed. Trying alternative method...", {
        id: "download",
      });

      try {
        // Fallback to direct link method
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = fileName || "music.mp3";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("Download started via browser!", { id: "download" });
      } catch (fallbackError) {
        console.error("Fallback download also failed:", fallbackError);
        toast.error("Download failed. Please try again or contact support.", {
          id: "download",
        });
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="p-3 rounded-lg border bg-neutral-50 border-neutral-200">
      <div className="text-neutral-800 font-medium mb-2">
        🎉 Your Generated Song:
      </div>

      <div className="relative">
        {audioLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 rounded">
            <span className="text-sm text-neutral-600">Loading audio...</span>
          </div>
        )}
        <audio
          controls
          className="w-full mt-2"
          onLoadStart={() => setAudioLoading(true)}
          onCanPlay={() => setAudioLoading(false)}
          onError={() => {
            setAudioLoading(false);
            toast.error(
              "Failed to load audio. You can still download the file.",
            );
          }}
        >
          <source src={downloadUrl} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      </div>

      <div className="flex gap-2 mt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={isDownloading}
          className="cursor-pointer disabled:cursor-not-allowed"
        >
          {isDownloading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Downloading...
            </span>
          ) : (
            "Download"
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateAnother}
          className="cursor-pointer"
        >
          Create Another
        </Button>
      </div>
    </div>
  );
}
