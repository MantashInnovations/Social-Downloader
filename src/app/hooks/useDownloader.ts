/**
 * useDownloader – Production-ready download hook.
 *
 * Calls the real Snag API backend (/api/meta & /api/download)
 * which uses yt-dlp under the hood to support 1000+ sites.
 *
 * Downloaded videos are streamed from the backend with a
 * Content-Length header so progress can be tracked accurately.
 * The browser then saves the file to the device's Downloads folder.
 */

import { useState, useCallback } from "react";

// ─── Types ─────────────────────────────────────────────────────────

export type Platform =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "facebook"
  | "twitter"
  | "snapchat"
  | "pinterest"
  | "linkedin"
  | "reddit"
  | "unknown";

export interface PlatformInfo {
  platform: Platform;
  label: string;
  color: string;
  gradient: string;
  emoji: string;
}

export interface VideoQuality {
  format_id: string;
  label: string;
  resolution: string;
  size: string;
  ext: string;
  recommended?: boolean;
}

export interface VideoMeta {
  title: string;
  thumbnail: string;
  duration: string;
  author: string;
  qualities: VideoQuality[];
  platformInfo: PlatformInfo;
}

export interface DownloadedItem {
  id: string;
  title: string;
  thumbnail: string;
  size: string;
  duration: string;
  date: string;
  platform: Platform;
  platformInfo: PlatformInfo;
}

export type DownloadState =
  | "idle"
  | "reading-clipboard"
  | "detecting"
  | "fetching-meta"
  | "quality-select"
  | "downloading"
  | "done"
  | "error";

// ─── Platform Detection ─────────────────────────────────────────────

const PLATFORM_MAP: Array<{ regex: RegExp; info: PlatformInfo }> = [
  {
    regex: /youtube\.com\/watch|youtu\.be\//i,
    info: {
      platform: "youtube",
      label: "YouTube",
      color: "bg-red-500",
      gradient: "radial-gradient(circle, rgba(239,68,68,0.3) 0%, transparent 70%)",
      emoji: "▶️",
    },
  },
  {
    regex: /tiktok\.com/i,
    info: {
      platform: "tiktok",
      label: "TikTok",
      color: "bg-zinc-900",
      gradient: "radial-gradient(circle, rgba(20,184,166,0.3) 0%, transparent 70%)",
      emoji: "🎵",
    },
  },
  {
    regex: /instagram\.com/i,
    info: {
      platform: "instagram",
      label: "Instagram",
      color: "bg-pink-500",
      gradient: "radial-gradient(circle, rgba(236,72,153,0.3) 0%, transparent 70%)",
      emoji: "📸",
    },
  },
  {
    regex: /facebook\.com|fb\.watch/i,
    info: {
      platform: "facebook",
      label: "Facebook",
      color: "bg-blue-600",
      gradient: "radial-gradient(circle, rgba(37,99,235,0.3) 0%, transparent 70%)",
      emoji: "👥",
    },
  },
  {
    regex: /twitter\.com|x\.com/i,
    info: {
      platform: "twitter",
      label: "X / Twitter",
      color: "bg-zinc-800",
      gradient: "radial-gradient(circle, rgba(113,113,122,0.3) 0%, transparent 70%)",
      emoji: "𝕏",
    },
  },
  {
    regex: /snapchat\.com/i,
    info: {
      platform: "snapchat",
      label: "Snapchat",
      color: "bg-yellow-400",
      gradient: "radial-gradient(circle, rgba(250,204,21,0.3) 0%, transparent 70%)",
      emoji: "👻",
    },
  },
  {
    regex: /pinterest\.com/i,
    info: {
      platform: "pinterest",
      label: "Pinterest",
      color: "bg-red-600",
      gradient: "radial-gradient(circle, rgba(220,38,38,0.3) 0%, transparent 70%)",
      emoji: "📌",
    },
  },
  {
    regex: /linkedin\.com/i,
    info: {
      platform: "linkedin",
      label: "LinkedIn",
      color: "bg-blue-700",
      gradient: "radial-gradient(circle, rgba(29,78,216,0.3) 0%, transparent 70%)",
      emoji: "💼",
    },
  },
  {
    regex: /reddit\.com/i,
    info: {
      platform: "reddit",
      label: "Reddit",
      color: "bg-orange-500",
      gradient: "radial-gradient(circle, rgba(249,115,22,0.3) 0%, transparent 70%)",
      emoji: "🤖",
    },
  },
];

export function detectPlatform(url: string): PlatformInfo {
  for (const { regex, info } of PLATFORM_MAP) {
    if (regex.test(url)) return info;
  }
  return {
    platform: "unknown",
    label: "Unknown",
    color: "bg-zinc-500",
    gradient: "radial-gradient(circle, rgba(113,113,122,0.2) 0%, transparent 70%)",
    emoji: "🌐",
  };
}

export function isValidUrl(str: string): boolean {
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// ─── LocalStorage persistence ───────────────────────────────────────

const STORAGE_KEY = "snag_downloads";

function loadDownloads(): DownloadedItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveDownloads(items: DownloadedItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ─── API Configuration ─────────────────────────────────────────────

/**
 * Replace this with your public Railway URL!
 * Example: "https://social-downloader.up.railway.app"
 */
const PRODUCTION_API_URL = "https://social-downloader-production.up.railway.app";

const API_BASE = PRODUCTION_API_URL;

// ─── Hook ──────────────────────────────────────────────────────────

export function useDownloader() {
  const [state, setState] = useState<DownloadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<VideoMeta | null>(null);
  const [downloads, setDownloads] = useState<DownloadedItem[]>(loadDownloads);
  const [detectedUrl, setDetectedUrl] = useState<string>("");

  // ── Fetch real metadata from API ────────────────────────────────
  const processUrl = useCallback(async (url: string) => {
    setError(null);
    setMeta(null);

    if (!isValidUrl(url)) {
      setState("error");
      setError("Invalid URL. Please copy a valid link from a supported app.");
      return;
    }

    setDetectedUrl(url);
    setState("detecting");

    const platformInfo = detectPlatform(url);

    await new Promise((r) => setTimeout(r, 400)); // brief UX pause
    setState("fetching-meta");

    try {
      const apiUrl = `${API_BASE}/api/meta?url=${encodeURIComponent(url)}`;
      const res = await fetch(apiUrl);

      if (!res.ok) {
        let errMsg = "Failed to fetch video info";
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch {
          /* ignore */
        }
        throw new Error(errMsg);
      }

      const data = await res.json();

      if (!data.formats || data.formats.length === 0) {
        throw new Error("No downloadable formats found for this URL.");
      }

      const videoMeta: VideoMeta = {
        title: data.title,
        thumbnail: data.thumbnail,
        duration: data.duration,
        author: data.author,
        platformInfo,
        qualities: data.formats,
      };

      setMeta(videoMeta);
      setState("quality-select");
    } catch (err: unknown) {
      setState("error");
      const msg = err instanceof Error ? err.message : "Could not fetch video info.";
      setError(msg);
    }
  }, []);

  // ── Read clipboard, then process URL ────────────────────────────
  const readClipboardAndProcess = useCallback(async () => {
    setState("reading-clipboard");
    setError(null);
    setMeta(null);

    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (!trimmed) {
        setState("error");
        setError("Clipboard is empty. Copy a video link first.");
        return;
      }
      await processUrl(trimmed);
    } catch {
      setState("error");
      setError("Clipboard access denied. Please paste your link in the box below.");
    }
  }, [processUrl]);

  // ── Download with real streaming progress ───────────────────────
  const startDownload = useCallback(
    async (quality: VideoQuality) => {
      if (!meta) return;
      setState("downloading");
      setProgress(0);

      const isAudio = quality.ext === "mp3" || quality.ext === "m4a";
      const params = new URLSearchParams({
        url: detectedUrl,
        format_id: quality.format_id,
        ext: quality.ext,
        title: meta.title,
      });

      try {
        const apiUrl = `${API_BASE}/api/download?${params.toString()}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
          let errMsg = "Download failed";
          try {
            const errData = await response.json();
            errMsg = errData.error || errMsg;
          } catch { /* ignore */ }
          throw new Error(errMsg);
        }

        // Read with streaming progress
        const contentLength = response.headers.get("content-length");
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        const reader = response.body!.getReader();
        const chunks: BlobPart[] = [];
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.length;
            if (total > 0) {
              setProgress(Math.min(98, Math.round((received / total) * 100)));
            } else {
              // No content-length: animate indeterminate progress
              setProgress((p) => Math.min(p + (p < 60 ? 3 : p < 85 ? 1 : 0.2), 94));
            }
          }
        }

        setProgress(100);

        // Build blob and trigger native browser save
        const mimeType = isAudio ? "audio/mpeg" : "video/mp4";
        const blob = new Blob(chunks, { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = blobUrl;
        anchor.download = `${meta.title.replace(/[^a-z0-9\s\-_]/gi, "").trim() || "video"}.${quality.ext}`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

        // Save record to Downloads history
        const actualSize =
          quality.size !== "Unknown"
            ? quality.size
            : received >= 1024 * 1024 * 1024
              ? `${(received / 1024 / 1024 / 1024).toFixed(2)} GB`
              : received >= 1024 * 1024
                ? `${(received / 1024 / 1024).toFixed(1)} MB`
                : `${(received / 1024).toFixed(0)} KB`;

        const newItem: DownloadedItem = {
          id: Date.now().toString(),
          title: meta.title,
          thumbnail: meta.thumbnail,
          size: actualSize,
          duration: meta.duration,
          date: new Date().toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
          platform: meta.platformInfo.platform,
          platformInfo: meta.platformInfo,
        };

        const updated = [newItem, ...loadDownloads()];
        saveDownloads(updated);
        setDownloads(updated);
        setState("done");

        setTimeout(() => {
          setState("idle");
          setProgress(0);
          setMeta(null);
          setDetectedUrl("");
        }, 2000);
      } catch (err: unknown) {
        setState("error");
        const msg = err instanceof Error ? err.message : "Download failed. Please try again.";
        setError(msg);
      }
    },
    [meta, detectedUrl]
  );

  const reset = useCallback(() => {
    setState("idle");
    setProgress(0);
    setError(null);
    setMeta(null);
    setDetectedUrl("");
  }, []);

  const deleteDownload = useCallback((id: string) => {
    const updated = loadDownloads().filter((d) => d.id !== id);
    saveDownloads(updated);
    setDownloads(updated);
  }, []);

  return {
    state,
    progress,
    error,
    meta,
    downloads,
    detectedUrl,
    readClipboardAndProcess,
    processUrl,
    startDownload,
    reset,
    deleteDownload,
  };
}
