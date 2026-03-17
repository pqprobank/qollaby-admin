/**
 * Upload size limits for admin portal (reusable across media upload components).
 */

/** Max allowed video file size: 1 GB */
export const MAX_VIDEO_UPLOAD_BYTES = 1 * 1024 * 1024 * 1024;

/** Human-readable labels */
export const MAX_VIDEO_UPLOAD_LABEL = "1 GB";

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}
