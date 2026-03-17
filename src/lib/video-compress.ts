/**
 * Client-side video conversion & compression.
 * Uses @ffmpeg/ffmpeg (loaded dynamically, browser only).
 */

/** Check if a file is already in MP4 container format */
export function isMp4File(file: File): boolean {
  return file.type === "video/mp4" || file.name.toLowerCase().endsWith(".mp4");
}

/** Get video duration in seconds using a video element (no FFmpeg needed). */
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video metadata"));
    };
    video.src = url;
  });
}

export type CompressProgress = (progress: number, message?: string) => void;

const POSTER_CAPTURE_TIMEOUT_MS = 12000;

type PosterOptions = {
  seekSeconds?: number;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
};

/**
 * Extract a poster image from a local video file in the browser.
 * Returns a JPEG file (or throws on failure).
 */
export async function extractPosterFromVideo(
  file: File,
  options: PosterOptions = {}
): Promise<File> {
  if (typeof window === "undefined") {
    throw new Error("extractPosterFromVideo can only run in the browser");
  }

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = objectUrl;

  const timeoutMs = POSTER_CAPTURE_TIMEOUT_MS;

  const cleanup = () => {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  };

  const waitForEvent = (eventName: "loadedmetadata" | "loadeddata" | "seeked") =>
    new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timed out waiting for ${eventName}`));
      }, timeoutMs);

      const handleSuccess = () => {
        clearTimeout(timer);
        resolve();
      };

      const handleError = () => {
        clearTimeout(timer);
        reject(new Error(`Failed while waiting for ${eventName}`));
      };

      video.addEventListener(eventName, handleSuccess, { once: true });
      video.addEventListener("error", handleError, { once: true });
    });

  try {
    await waitForEvent("loadedmetadata");

    const duration = Number.isFinite(video.duration) ? Math.max(video.duration, 0) : 0;
    const safeSeek =
      options.seekSeconds !== undefined
        ? Math.max(0, options.seekSeconds)
        : duration > 0
          ? Math.min(0.5, duration * 0.1)
          : 0;

    if (safeSeek > 0 && safeSeek < duration) {
      video.currentTime = safeSeek;
      await waitForEvent("seeked");
    } else if (video.readyState < 2) {
      await waitForEvent("loadeddata");
    }

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;

    if (!sourceWidth || !sourceHeight) {
      throw new Error("Video frame dimensions are not available");
    }

    const maxWidth = options.maxWidth ?? 1280;
    const maxHeight = options.maxHeight ?? 1280;
    const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight, 1);
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not create canvas context");
    }

    context.drawImage(video, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", options.quality ?? 0.82);
    });

    if (!blob) {
      throw new Error("Could not encode poster image");
    }

    const baseName = file.name.replace(/\.[^.]+$/i, "") || "video";
    return new File([blob], `${baseName}-poster.jpg`, { type: "image/jpeg" });
  } finally {
    cleanup();
  }
}

/**
 * Compress a video to 720p (max 1280px width) with CRF 23.
 * Matches the mobile app's compression: `react-native-compressor` with
 * `maxSize: 1280, compressionMethod: "auto"`.
 *
 * Runs in browser via @ffmpeg/ffmpeg WASM.
 */
export async function compressVideo(
  file: File,
  _targetMaxBytes?: number, // kept for API compat, no longer used
  onProgress?: CompressProgress
): Promise<File> {
  if (typeof window === "undefined") {
    throw new Error("compressVideo can only run in the browser");
  }

  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { fetchFile } = await import("@ffmpeg/util");

  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const inputPath = `input.${ext}`;
  const outputPath = "output.mp4";

  onProgress?.(0, "Loading FFmpeg...");
  const ffmpeg = new FFmpeg();

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(Math.min(90, Math.round(progress * 100)), "Compressing...");
    });
  }

  await ffmpeg.load();
  onProgress?.(5, "Reading file...");
  await ffmpeg.writeFile(inputPath, await fetchFile(file));

  onProgress?.(15, "Compressing video...");
  const TEN_MINUTES_MS = 10 * 60 * 1000;
  const exitCode = await ffmpeg.exec(
    [
      "-i", inputPath,
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "23",
      "-vf", "scale='min(1280,iw)':-2",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      "-y", outputPath,
    ],
    TEN_MINUTES_MS,
    {}
  );

  if (exitCode !== 0) {
    throw new Error("Video compression failed");
  }

  onProgress?.(95, "Reading result...");
  const data = await ffmpeg.readFile(outputPath);
  const outName = file.name.replace(/\.[^.]+$/i, ".mp4") || "video.mp4";
  onProgress?.(100, "Done");

  try {
    await ffmpeg.deleteFile(inputPath);
    await ffmpeg.deleteFile(outputPath);
  } catch {
    // ignore cleanup errors
  }
  const blobPart = data instanceof Uint8Array ? new Uint8Array(data) : data;
  return new File([blobPart], outName, { type: "video/mp4" });
}

/**
 * Fast remux: copy streams into an MP4 container without re-encoding.
 * This is much faster than full compression and preserves original quality.
 * Falls back to H.264 re-encoding if codec-copy fails (e.g. HEVC in MOV).
 */
export async function remuxToMp4(
  file: File,
  onProgress?: CompressProgress
): Promise<File> {
  if (typeof window === "undefined") {
    throw new Error("remuxToMp4 can only run in the browser");
  }

  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { fetchFile } = await import("@ffmpeg/util");

  const ext = file.name.split(".").pop()?.toLowerCase() || "mov";
  const inputPath = `input.${ext}`;
  const outputPath = "output.mp4";

  onProgress?.(0, "Loading FFmpeg...");
  const ffmpeg = new FFmpeg();

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(Math.min(90, Math.round(progress * 100)), "Converting...");
    });
  }

  await ffmpeg.load();
  onProgress?.(10, "Reading file...");
  await ffmpeg.writeFile(inputPath, await fetchFile(file));

  onProgress?.(20, "Converting to MP4...");
  const FIVE_MINUTES_MS = 5 * 60 * 1000;

  // Try fast remux first (copy codecs)
  let exitCode = await ffmpeg.exec(
    ["-i", inputPath, "-c", "copy", "-movflags", "+faststart", "-y", outputPath],
    FIVE_MINUTES_MS,
    {}
  );

  // If copy failed, fall back to re-encoding with H.264
  if (exitCode !== 0) {
    onProgress?.(30, "Re-encoding to H.264...");
    exitCode = await ffmpeg.exec(
      [
        "-i", inputPath,
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        "-y", outputPath,
      ],
      FIVE_MINUTES_MS * 2,
      {}
    );
  }

  if (exitCode !== 0) {
    throw new Error("Video conversion failed");
  }

  onProgress?.(95, "Reading result...");
  const data = await ffmpeg.readFile(outputPath);
  const outName = file.name.replace(/\.[^.]+$/i, ".mp4") || "video.mp4";
  onProgress?.(100, "Done");

  try {
    await ffmpeg.deleteFile(inputPath);
    await ffmpeg.deleteFile(outputPath);
  } catch {
    // ignore cleanup errors
  }
  const blobPart = data instanceof Uint8Array ? new Uint8Array(data) : data;
  return new File([blobPart], outName, { type: "video/mp4" });
}
