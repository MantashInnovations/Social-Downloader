import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router";
import { Video, ClipboardPaste, RotateCcw, Download, CheckCircle2, AlertCircle, ChevronRight, Sparkles, Zap } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  useDownloader,
  detectPlatform,
  isValidUrl,
  type VideoQuality,
} from "../hooks/useDownloader";

// ─── Supported Platforms Strip ────────────────────────────────────

const PLATFORMS = [
  { emoji: "▶️", label: "YouTube" },
  { emoji: "🎵", label: "TikTok" },
  { emoji: "📸", label: "Instagram" },
  { emoji: "👥", label: "Facebook" },
  { emoji: "𝕏", label: "X" },
  { emoji: "👻", label: "Snapchat" },
  { emoji: "📌", label: "Pinterest" },
  { emoji: "💼", label: "LinkedIn" },
  { emoji: "🤖", label: "Reddit" },
];

// ─── Progress Ring ────────────────────────────────────────────────

function ProgressRing({ progress, size = 232 }: { progress: number; size?: number }) {
  const strokeWidth = 3;
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;

  return (
    <svg
      className="absolute inset-0 -rotate-90 pointer-events-none"
      width={size}
      height={size}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-zinc-200 dark:text-zinc-800"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#progress-grad)"
        strokeWidth={strokeWidth + 1}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ ease: "easeOut", duration: 0.3 }}
      />
      <defs>
        <linearGradient id="progress-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Quality Sheet ────────────────────────────────────────────────

function QualitySheet({
  meta,
  onSelect,
  onDismiss,
}: {
  meta: NonNullable<ReturnType<typeof useDownloader>["meta"]>;
  onSelect: (q: VideoQuality) => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 26, stiffness: 300 }}
      className="absolute inset-x-0 bottom-0 z-20 bg-white dark:bg-zinc-950 rounded-t-[2.5rem] shadow-2xl border-t border-zinc-100 dark:border-zinc-800 pb-8"
    >
      {/* Handle */}
      <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mt-4 mb-4" />

      {/* Preview */}
      <div className="flex items-center gap-3 px-6 mb-5">
        <div className="w-16 h-14 rounded-xl overflow-hidden shrink-0 bg-zinc-200 dark:bg-zinc-800">
          <img
            src={meta.thumbnail}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">{meta.platformInfo.emoji}</span>
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {meta.platformInfo.label}
            </span>
          </div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate leading-tight">
            {meta.title}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {meta.author} · {meta.duration}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Watermark-free badge */}
      <div className="mx-6 mb-4 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl px-3 py-2.5">
        <Sparkles size={14} className="text-emerald-500 shrink-0" />
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
          Downloads are watermark-free in the highest available quality
        </p>
      </div>

      {/* Quality options */}
      <div className="px-6 space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar pb-2">
        {meta.qualities
          .filter(q => q.label && q.label !== "Unknown")
          .map((q) => (
            <button
              key={q.format_id}
              onClick={() => onSelect(q)}
              className="w-full flex items-center justify-between p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/40 flex items-center justify-center transition-colors">
                  <Download size={15} className="text-zinc-600 dark:text-zinc-400 group-hover:text-violet-600 dark:group-hover:text-violet-400" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {q.label}
                    </span>
                    {q.recommended && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 rounded-md">
                        BEST
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>{q.resolution}</span>
                    {q.ext && (
                      <>
                        <span>•</span>
                        <span className="uppercase text-[10px] font-bold opacity-60 bg-zinc-200 dark:bg-zinc-800 px-1 rounded">{q.ext}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {q.size && q.size !== "Unknown" && (
                  <span className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 px-2 py-1 rounded-lg">
                    {q.size}
                  </span>
                )}
                <ChevronRight size={14} className="text-zinc-300 dark:text-zinc-600 group-hover:text-violet-500 transition-colors" />
              </div>
            </button>
          ))}
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────

export function Home() {
  const {
    state,
    progress,
    error,
    meta,
    detectedUrl,
    readClipboardAndProcess,
    processUrl,
    startDownload,
    reset,
  } = useDownloader();

  const [manualUrl, setManualUrl] = useState("");
  const [manualPlatform, setManualPlatform] = useState<ReturnType<typeof detectPlatform> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Toast on done
  useEffect(() => {
    if (state === "done") {
      toast.success("Saved to Downloads!", {
        description: "Tap 'Videos' to view your file.",
        duration: 3000,
      });
    }
  }, [state]);

  // Detect platform as user types in manual input
  const handleManualChange = (val: string) => {
    setManualUrl(val);
    if (isValidUrl(val.trim())) {
      setManualPlatform(detectPlatform(val.trim()));
    } else {
      setManualPlatform(null);
    }
  };

  const handleManualSubmit = () => {
    if (manualUrl.trim()) {
      processUrl(manualUrl.trim());
    }
  };

  const isLoading =
    state === "reading-clipboard" ||
    state === "detecting" ||
    state === "fetching-meta";

  // ── Circle inner content ────────────────────────────────────────

  const renderCircleContent = () => {
    if (state === "downloading") {
      return (
        <div className="flex flex-col items-center gap-3 z-10 text-center px-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-3xl"
          >
            ⬇️
          </motion.div>
          <div>
            <p className="text-sm font-bold text-zinc-900 dark:text-white">
              {progress < 100 ? `${progress}%` : "Done!"}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Downloading…</p>
          </div>
        </div>
      );
    }

    if (state === "done") {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-2 z-10"
        >
          <CheckCircle2 size={40} className="text-emerald-500" />
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Saved!</p>
        </motion.div>
      );
    }

    if (state === "error") {
      return (
        <div className="flex flex-col items-center gap-2 z-10 text-center px-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring" }}
          >
            <AlertCircle size={48} className="text-red-500/20" />
          </motion.div>
          <p className="text-sm font-bold text-zinc-400">Oops!</p>
        </div>
      );
    }

    if (isLoading) {
      const labels: Record<string, string> = {
        "reading-clipboard": "Reading clipboard…",
        detecting: "Detecting platform…",
        "fetching-meta": "Fetching video info…",
      };
      return (
        <div className="flex flex-col items-center gap-3 z-10 text-center px-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          >
            <Zap size={28} className="text-violet-500" />
          </motion.div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            {labels[state] ?? "Loading…"}
          </p>
        </div>
      );
    }

    if (state === "quality-select" && meta) {
      return (
        <div className="flex flex-col items-center gap-2 z-10 text-center px-4">
          <span className="text-3xl">{meta.platformInfo.emoji}</span>
          <div>
            <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">
              {meta.platformInfo.label}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-[130px] truncate">
              {meta.title}
            </p>
          </div>
        </div>
      );
    }

    // Idle
    return (
      <>
        <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <ClipboardPaste className="w-6 h-6 text-zinc-900 dark:text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Paste &amp; Save</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-[140px]">
            Tap to grab video from clipboard
          </p>
        </div>
      </>
    );
  };

  // ── Glow colour when platform is detected ────────────────────────
  const glowStyle =
    meta && state === "quality-select"
      ? { background: meta.platformInfo.gradient }
      : {};

  return (
    <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-950 px-6 pb-6 pt-4 text-zinc-900 dark:text-zinc-50 relative h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 shrink-0">
        <div>
          <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
            Downloader
          </h2>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5">Ready</h1>
        </div>
      </div>

      {/* Center area */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-0">

        {/* Ambient glow behind circle */}
        <div
          className="absolute w-64 h-64 rounded-full pointer-events-none opacity-60 blur-2xl transition-all duration-700"
          style={glowStyle}
        />

        {/* Floating Error Message Above Circle */}
        <AnimatePresence>
          {state === "error" && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute -top-16 left-0 right-0 mx-auto w-fit z-30"
            >
              <div className="bg-red-500 text-white rounded-2xl px-5 py-3 shadow-xl flex items-center gap-3 border border-red-400">
                <div className="bg-white/20 p-1.5 rounded-lg shrink-0">
                  <AlertCircle size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold leading-none mb-0.5 whitespace-nowrap">Error</p>
                  <p className="text-[10px] opacity-90 leading-tight">
                    {error ?? "Something went wrong"}
                  </p>
                </div>
                <button
                  onClick={reset}
                  className="ml-2 pl-3 border-l border-white/20 text-[10px] font-bold tracking-tight hover:opacity-75 transition-opacity py-1 shrink-0"
                >
                  RETRY
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Big circle */}
        <div className="relative w-56 h-56 sm:w-[232px] sm:h-[232px]">
          {/* Progress ring – only during download */}
          {state === "downloading" && (
            <ProgressRing progress={progress} size={232} />
          )}

          {/* Error ring glow */}
          {state === "error" && (
            <div className="absolute inset-0 rounded-full ring-2 ring-red-400/60 animate-pulse" />
          )}

          <motion.div
            animate={
              state === "idle"
                ? { scale: [1, 1.04, 1], boxShadow: ["0px 0px 0px rgba(0,0,0,0)", "0px 0px 40px rgba(120,120,120,0.15)", "0px 0px 0px rgba(0,0,0,0)"] }
                : {}
            }
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center relative cursor-pointer group shadow-xl overflow-hidden"
            onClick={state === "idle" || state === "error" ? readClipboardAndProcess : undefined}
          >
            {/* Spinning dashed ring */}
            <div className="absolute inset-0 m-auto w-[90%] h-[90%] rounded-full border border-dashed border-zinc-200 dark:border-zinc-700 animate-[spin_30s_linear_infinite]" />

            <AnimatePresence mode="wait">
              <motion.div
                key={state}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center gap-3 z-10 text-center px-4"
              >
                {renderCircleContent()}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Platform chips */}
        <div className="flex gap-2 mt-8 flex-wrap justify-center max-w-[260px]">
          {PLATFORMS.map((p) => (
            <motion.div
              key={p.label}
              whileHover={{ scale: 1.15 }}
              title={p.label}
              className="w-9 h-9 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-base shadow-sm cursor-default select-none"
            >
              {p.emoji}
            </motion.div>
          ))}
        </div>

        {/* Manual URL input */}
        <div className="w-full max-w-xs mt-6 relative flex items-center bg-white dark:bg-zinc-900 rounded-2xl pr-2 shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {manualPlatform ? (
            <span className="pl-4 text-base shrink-0">{manualPlatform.emoji}</span>
          ) : (
            <span className="pl-4 text-zinc-400 shrink-0">🔗</span>
          )}
          <input
            ref={inputRef}
            type="url"
            placeholder="Or paste URL here…"
            value={manualUrl}
            onChange={(e) => handleManualChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
            className="flex-1 bg-transparent border-none outline-none px-3 py-3 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-500"
          />
          {manualUrl && (
            <button
              onClick={handleManualSubmit}
              className="shrink-0 w-8 h-8 rounded-full bg-zinc-900 dark:bg-white flex items-center justify-center hover:scale-105 transition-transform"
            >
              <ChevronRight size={14} className="text-white dark:text-zinc-900" />
            </button>
          )}
        </div>
      </div>

      {/* Videos CTA */}
      <div className="mt-auto shrink-0 pt-4">
        <Link
          to="/videos"
          className="w-full bg-black dark:bg-white text-white dark:text-black rounded-[2rem] py-4 px-6 flex items-center justify-between hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group shadow-xl"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white/20 dark:bg-black/10 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="block text-base font-bold">Videos</span>
              <span className="block text-xs opacity-70">View downloaded files</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/10 dark:bg-black/5 flex items-center justify-center group-hover:translate-x-1 transition-transform">
            <ChevronRight size={16} />
          </div>
        </Link>
      </div>

      {/* Quality Sheet */}
      <AnimatePresence>
        {state === "quality-select" && meta && (
          <QualitySheet
            meta={meta}
            onSelect={(q) => startDownload(q)}
            onDismiss={reset}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
