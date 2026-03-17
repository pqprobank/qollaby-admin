"use client";

import { ChevronLeft, ChevronRight, Play, Volume2, VolumeX, Pause, RefreshCw, AlertCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ImageThumbnail } from "@/components/ui/image-thumbnail";

const LOAD_TIMEOUT_MS = 3000;

interface MediaCarouselProps {
  media: Array<{
    url: string;
    isVideo: boolean;
    posterUrl?: string;
  }>;
  className?: string;
}

export function MediaCarousel({ media, className }: MediaCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentMedia = media[currentIndex];
  const hasMultiple = media.length > 1;
  const currentVideoUrl = currentMedia?.url || "";

  const getVideoSrc = useCallback(
    (url: string, attempt: number) => {
      if (attempt === 0) return url;
      const sep = url.includes("?") ? "&" : "?";
      return `${url}${sep}_r=${attempt}`;
    },
    []
  );

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetVideoState = useCallback(() => {
    setIsPlaying(false);
    setVideoError(false);
    setVideoLoaded(false);
    setRetryCount(0);
    clearTimer();
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [clearTimer]);

  const goToNext = useCallback(() => {
    resetVideoState();
    setCurrentIndex((prev) => (prev + 1) % media.length);
  }, [media.length, resetVideoState]);

  const goToPrev = useCallback(() => {
    resetVideoState();
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  }, [media.length, resetVideoState]);

  const goToIndex = useCallback(
    (idx: number) => {
      if (idx === currentIndex) return;
      resetVideoState();
      setCurrentIndex(idx);
    },
    [currentIndex, resetVideoState]
  );

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  // 3s timeout for video loading
  useEffect(() => {
    if (currentMedia?.isVideo && !videoLoaded && !videoError) {
      clearTimer();
      timerRef.current = setTimeout(() => {
        if (!videoLoaded) setVideoError(true);
      }, LOAD_TIMEOUT_MS);
    }
    return clearTimer;
  }, [currentMedia?.isVideo, videoLoaded, videoError, retryCount, clearTimer]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleVideoError = useCallback(() => {
    if (!currentVideoUrl) {
      setVideoError(true);
      return;
    }

    clearTimer();
    if (retryCount < 2) {
      const next = retryCount + 1;
      setRetryCount(next);
      setVideoLoaded(false);
      if (videoRef.current) {
        videoRef.current.src = getVideoSrc(currentVideoUrl, next);
        videoRef.current.load();
      }
    } else {
      setVideoError(true);
    }
  }, [retryCount, currentVideoUrl, getVideoSrc, clearTimer]);

  const handleVideoLoaded = useCallback(() => {
    clearTimer();
    setVideoLoaded(true);
  }, [clearTimer]);

  const handleManualRetry = useCallback(() => {
    if (!currentVideoUrl) {
      setVideoError(true);
      return;
    }

    setVideoError(false);
    setVideoLoaded(false);
    setRetryCount(0);
    if (videoRef.current) {
      videoRef.current.src = getVideoSrc(currentVideoUrl, 0);
      videoRef.current.load();
    }
  }, [currentVideoUrl, getVideoSrc]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === " " && currentMedia?.isVideo) {
        e.preventDefault();
        togglePlay();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrev, goToNext, currentMedia, togglePlay]);

  if (!media || media.length === 0) {
    return null;
  }

  return (
    <div className={cn("relative w-full aspect-square rounded-lg overflow-hidden bg-secondary/30", className)}>
      <div className="w-full h-full">
        {currentMedia.isVideo ? (
          <div className="relative w-full h-full group">
            {videoError ? (
              <div className="relative w-full h-full">
                {currentMedia.posterUrl ? (
                  <img
                    src={currentMedia.posterUrl}
                    alt={`Media ${currentIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-secondary/40" />
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 gap-3">
                  <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm text-muted-foreground">Video failed to load</p>
                  <button
                    onClick={handleManualRetry}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  src={getVideoSrc(currentMedia.url, retryCount)}
                  className="w-full h-full object-cover"
                  muted={isMuted}
                  playsInline
                  preload="metadata"
                  poster={currentMedia.posterUrl}
                  onLoadedData={handleVideoLoaded}
                  onEnded={handleVideoEnded}
                  onClick={togglePlay}
                  onError={handleVideoError}
                />
                
                {/* Video controls overlay */}
                <div className={cn(
                  "absolute inset-0 flex items-center justify-center transition-opacity",
                  isPlaying ? "opacity-0 hover:opacity-100" : "opacity-100"
                )}>
                  <button
                    onClick={togglePlay}
                    className="w-16 h-16 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8" />
                    ) : (
                      <Play className="w-8 h-8 ml-1" />
                    )}
                  </button>
                </div>

                {/* Mute button */}
                <button
                  onClick={toggleMute}
                  className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors z-10"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
              </>
            )}

            {/* Video indicator badge */}
            <div className="absolute top-4 right-4 px-2 py-1 rounded bg-black/60 text-white text-xs font-medium flex items-center gap-1">
              <Play className="w-3 h-3" />
              Video
            </div>
          </div>
        ) : (
          <ImageThumbnail
            src={currentMedia.url}
            alt={`Media ${currentIndex + 1}`}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Navigation arrows */}
      {hasMultiple && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors z-10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Pagination dots */}
      {hasMultiple && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {media.map((item, idx) => (
            <button
              key={idx}
              onClick={() => goToIndex(idx)}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                idx === currentIndex 
                  ? "bg-white" 
                  : "bg-white/50 hover:bg-white/70"
              )}
            />
          ))}
        </div>
      )}

      {/* Media counter */}
      {hasMultiple && (
        <div className="absolute top-4 left-4 px-2 py-1 rounded bg-black/60 text-white text-xs font-medium">
          {currentIndex + 1} / {media.length}
        </div>
      )}
    </div>
  );
}
