"use client";

import { useRef, useCallback, useState } from "react";
import { Upload, XCircle, Loader2 } from "lucide-react";
import {
  MAX_VIDEO_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_LABEL,
} from "@/lib/upload-limits";
import {
  compressVideo,
  remuxToMp4,
  isMp4File,
  extractPosterFromVideo,
} from "@/lib/video-compress";

export interface MediaUploadValue {
  files: File[];
  previews: string[];
  posters: Array<File | null>;
}

interface MediaUploadProps {
  value: MediaUploadValue;
  onChange: (value: MediaUploadValue) => void;
  accept?: string;
  /** Max size for video files (default 1 GB). */
  maxVideoSizeBytes?: number;
  multiple?: boolean;
  disabled?: boolean;
  /** Label for the required asterisk / description. */
  label?: string;
  placeholder?: string;
  addMoreLabel?: string;
}

const DEFAULT_ACCEPT = "image/*,video/*";

export function MediaUpload({
  value,
  onChange,
  accept = DEFAULT_ACCEPT,
  maxVideoSizeBytes = MAX_VIDEO_UPLOAD_BYTES,
  multiple = true,
  disabled = false,
  label = "Photo/Video",
  placeholder = "Tap to upload photos or videos",
  addMoreLabel = "Add more photos or videos",
}: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);

  const revokePreviews = useCallback((previews: string[]) => {
    previews.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const addFiles = useCallback(
    async (newFiles: File[]) => {
      const newPreviews: string[] = [];
      const resolvedFiles: File[] = [];
      const newPosters: Array<File | null> = [];

      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        const isVideo = file.type.startsWith("video/");
        let resolvedFile = file;

        if (isVideo && file.size > maxVideoSizeBytes) {
          revokePreviews(newPreviews);
          throw new Error(
            `Video "${file.name}" exceeds max size ${MAX_VIDEO_UPLOAD_LABEL}. Please choose a smaller file.`
          );
        }

        if (isVideo) {
          if (isMp4File(file)) {
            resolvedFile = file;
          } else {
            try {
              resolvedFile = await remuxToMp4(file);
            } catch {
              resolvedFile = file;
            }
          }
        }

        resolvedFiles.push(resolvedFile);
        newPreviews.push(URL.createObjectURL(resolvedFile));

        if (isVideo) {
          let poster: File | null = null;
          try {
            poster = await extractPosterFromVideo(resolvedFile);
          } catch (err) {
            console.warn("[MediaUpload] Canvas poster extraction failed, trying with compressed copy:", err);
            if (resolvedFile === file) {
              try {
                const compressed = await compressVideo(file);
                poster = await extractPosterFromVideo(compressed);
              } catch (err2) {
                console.warn("[MediaUpload] Fallback poster extraction also failed:", err2);
              }
            }
          }
          newPosters.push(poster);
        } else {
          newPosters.push(null);
        }
      }

      onChange({
        files: [...value.files, ...resolvedFiles],
        previews: [...value.previews, ...newPreviews],
        posters: [...(value.posters || []), ...newPosters],
      });
    },
    [value, onChange, maxVideoSizeBytes, revokePreviews]
  );

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      setCompressing(true);
      try {
        await addFiles(files);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Upload error");
      } finally {
        setCompressing(false);
      }
      e.target.value = "";
    },
    [addFiles]
  );

  const removeAt = useCallback(
    (index: number) => {
      URL.revokeObjectURL(value.previews[index]);
      onChange({
        files: value.files.filter((_, i) => i !== index),
        previews: value.previews.filter((_, i) => i !== index),
        posters: (value.posters || []).filter((_, i) => i !== index),
      });
    },
    [value, onChange]
  );


  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">
        {label} <span className="text-red-500">*</span>
      </p>
      <p className="text-xs text-muted-foreground">
        Video max {MAX_VIDEO_UPLOAD_LABEL}; all videos auto-compressed to 720p.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        disabled={disabled || compressing}
        className="hidden"
      />

      {value.previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-2">
          {value.previews.map((preview, index) => {
            const file = value.files[index];
            const isVideo = file?.type.startsWith("video/");
            return (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden bg-secondary/30"
              >
                {isVideo ? (
                  <video src={preview} className="w-full h-full object-cover" />
                ) : (
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}
                {isVideo && (
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-xs">
                    Video
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  disabled={disabled}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div
        onClick={() => !disabled && !compressing && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors bg-secondary/20 ${
          disabled || compressing
            ? "border-border/50 opacity-60 cursor-not-allowed"
            : "border-border/50 hover:border-primary/50 cursor-pointer"
        }`}
      >
        {compressing ? (
          <>
            <Loader2 className="h-8 w-8 mx-auto mb-2 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Compressing video…</p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {value.previews.length > 0 ? addMoreLabel : placeholder}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
