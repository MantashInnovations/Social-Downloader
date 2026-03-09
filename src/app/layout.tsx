import { Outlet } from "react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, Moon, Sun } from "lucide-react";
import { Toaster } from "sonner";

export function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  const toggleTheme = () => {
    setTheme(t => (t === "light" ? "dark" : "light"));
  };

  return (
    <div className={`min-h-screen bg-zinc-100 dark:bg-black flex items-center justify-center p-0 sm:p-8 transition-colors duration-300 ${theme}`}>
      {/* Mobile Device Frame */}
      <div className="w-full h-[100dvh] sm:h-[800px] sm:max-w-[375px] bg-white dark:bg-zinc-950 sm:rounded-[2.5rem] sm:border-[8px] border-zinc-300 dark:border-zinc-800 relative overflow-hidden shadow-2xl flex flex-col transition-colors duration-300">

        {/* Status Bar Mock (visible only on desktop frame) */}
        <div className="hidden sm:flex justify-between items-center px-6 pt-2 pb-1 text-[10px] font-medium text-zinc-900 dark:text-zinc-100 z-50 absolute top-0 w-full bg-transparent">
          <span>9:41</span>
          <div className="flex gap-1.5 items-center">
            <div className="w-4 h-2.5 bg-current rounded-[2px]" />
          </div>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="absolute top-4 sm:top-8 right-4 z-50 p-2 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <AnimatePresence mode="wait">
          {showSplash ? (
            <motion.div
              key="splash"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 z-40 bg-white dark:bg-zinc-950 flex flex-col items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                className="w-24 h-24 rounded-3xl bg-black dark:bg-white flex items-center justify-center mb-6"
              >
                <Download className="text-white dark:text-black w-10 h-10" />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white"
              >
                Snag
              </motion.h1>
            </motion.div>
          ) : (
            <motion.div
              key="app"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col relative h-full w-full pt-14 sm:pt-16"
            >
              <Outlet />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Toaster position="top-center" richColors />
    </div>
  );
}
