import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router";
import { ArrowLeft, Play, Trash2, List, LayoutGrid, Download } from "lucide-react";
import { useDownloader, type DownloadedItem } from "../hooks/useDownloader";

// ─── Platform Badge ───────────────────────────────────────────────

function PlatformBadge({ item }: { item: DownloadedItem }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
      <span>{item.platformInfo.emoji}</span>
      {item.platformInfo.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────

export function Videos() {
  const { downloads, deleteDownload } = useDownloader();
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  return (
    <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-950 px-6 pt-4 pb-6 h-full overflow-hidden relative text-zinc-900 dark:text-zinc-50">

      {/* Header */}
      <div className="flex items-center justify-between mb-8 shrink-0 relative z-10">
        <Link
          to="/"
          className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center hover:scale-105 transition-transform text-zinc-900 dark:text-white"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="text-center absolute inset-x-0 mx-auto -z-10 flex flex-col items-center">
          <h1 className="text-xl font-bold tracking-tight">Downloads</h1>
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {downloads.length} {downloads.length === 1 ? "item" : "items"}
          </span>
        </div>
        <button
          onClick={() => setViewMode((p) => (p === "card" ? "list" : "card"))}
          className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center hover:scale-105 transition-transform text-zinc-900 dark:text-white z-10"
          aria-label="Toggle view mode"
        >
          {viewMode === "card" ? <List size={18} /> : <LayoutGrid size={18} />}
        </button>
      </div>

      {/* Video List */}
      <div className="flex-1 overflow-y-auto -mx-6 px-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-200 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="space-y-4 pb-20">
          <AnimatePresence>
            {downloads.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-64 text-zinc-400 dark:text-zinc-600 gap-4"
              >
                <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                  <Download size={32} className="opacity-40" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">No downloads yet</p>
                  <p className="text-xs mt-1 opacity-60">
                    Go back and tap the circle to start
                  </p>
                </div>
              </motion.div>
            ) : (
              downloads.map((video, idx) => (
                <motion.div
                  key={video.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40, scale: 0.95 }}
                  transition={{ delay: idx * 0.05, duration: 0.35 }}
                  className={
                    viewMode === "card"
                      ? "bg-white dark:bg-zinc-900 rounded-[2rem] p-3 shadow-sm border border-zinc-100 dark:border-zinc-800/50 flex flex-col group overflow-hidden"
                      : "bg-white dark:bg-zinc-900 rounded-2xl p-3 shadow-sm border border-zinc-100 dark:border-zinc-800/50 flex flex-row items-center gap-4 group overflow-hidden"
                  }
                >
                  {viewMode === "card" ? (
                    // ── Card View ─────────────────────────────────
                    <>
                      <div className="relative w-full h-40 sm:h-48 rounded-3xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 cursor-pointer hover:bg-white/30 transition-colors z-10">
                          <Play className="text-white fill-white ml-1 w-5 h-5" />
                        </div>
                        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold text-white">
                          {video.duration}
                        </div>
                        <div className="absolute top-3 left-3">
                          <PlatformBadge item={video} />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 px-2 pb-1">
                        <div className="flex flex-col truncate pr-4">
                          <h3 className="font-semibold text-sm truncate text-zinc-900 dark:text-zinc-100">
                            {video.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                              {video.size}
                            </span>
                            <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                              {video.date}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteDownload(video.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                          aria-label="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  ) : (
                    // ── List View ─────────────────────────────────
                    <>
                      <div className="relative w-24 h-20 rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                        />
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 cursor-pointer hover:bg-white/30 transition-colors z-10">
                          <Play className="text-white fill-white ml-0.5 w-3 h-3" />
                        </div>
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded-[4px] text-[8px] font-bold text-white">
                          {video.duration}
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col min-w-0 pr-2">
                        <h3 className="font-semibold text-sm truncate text-zinc-900 dark:text-zinc-100">
                          {video.title}
                        </h3>
                        <div className="mt-1">
                          <PlatformBadge item={video} />
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                            {video.size}
                          </span>
                          <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {video.date}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteDownload(video.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                        aria-label="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
