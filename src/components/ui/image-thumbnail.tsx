"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ImageThumbnailProps {
  src: string;
  alt: string;
  className?: string;
  maxRetries?: number;
}

function ImageThumbnailInner({
  src,
  alt,
  className = "w-full h-full object-cover",
  maxRetries = 2,
}: ImageThumbnailProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setStatus("loading");
    setRetryCount(0);
  }, [src]);

  const getUrl = useCallback(
    (attempt: number) => {
      if (attempt === 0) return src;
      const sep = src.includes("?") ? "&" : "?";
      return `${src}${sep}_r=${attempt}`;
    },
    [src]
  );

  const handleLoad = useCallback(() => {
    setStatus("ready");
  }, []);

  const handleError = useCallback(() => {
    if (retryCount < maxRetries) {
      const next = retryCount + 1;
      setRetryCount(next);
      setStatus("loading");
      if (imgRef.current) {
        imgRef.current.src = getUrl(next);
      }
    } else {
      setStatus("error");
    }
  }, [getUrl, maxRetries, retryCount]);

  const handleManualRetry = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setRetryCount(0);
      setStatus("loading");
      if (imgRef.current) {
        imgRef.current.src = getUrl(0);
      }
    },
    [getUrl]
  );

  return (
    <div className="relative w-full h-full bg-secondary/40">
      {status !== "error" && (
        <img
          ref={imgRef}
          src={getUrl(retryCount)}
          alt={alt}
          className={className}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/20 pointer-events-none">
          <div className="h-5 w-5 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/35">
          <AlertCircle className="h-6 w-6 text-muted-foreground/70" />
          <button
            type="button"
            onClick={handleManualRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

export function ImageThumbnail(props: ImageThumbnailProps) {
  return <ImageThumbnailInner key={props.src} {...props} />;
}
