import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("cc_theme") === "dark";
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("cc_theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("cc_theme", "light");
    }
  }, [isDark]);

  // Also apply on first mount (in case page reloads)
  useEffect(() => {
    if (localStorage.getItem("cc_theme") === "dark") {
      document.documentElement.classList.add("dark");
    }
  }, []);

  return (
    <motion.button
      onClick={() => setIsDark(!isDark)}
      className="relative flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300"
      style={{
        background: isDark
          ? "linear-gradient(135deg, hsl(230, 20%, 20%), hsl(250, 20%, 15%))"
          : "linear-gradient(135deg, hsl(48, 100%, 90%), hsl(45, 80%, 80%))",
        border: `2px solid ${isDark ? "hsl(220, 10%, 35%)" : "hsl(40, 60%, 60%)"}`,
        boxShadow: isDark
          ? "0 0 12px hsla(48, 100%, 50%, 0.15), inset 0 1px 0 hsla(0, 0%, 100%, 0.05)"
          : "2px 2px 0 0 black",
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {/* Sliding pill indicator */}
      <motion.div
        className="absolute top-[3px] w-6 h-6 rounded-full"
        style={{
          background: isDark
            ? "hsl(48, 100%, 50%)"
            : "hsl(40, 80%, 55%)",
          boxShadow: isDark
            ? "0 0 8px hsla(48, 100%, 50%, 0.5)"
            : "0 0 4px hsla(40, 80%, 55%, 0.4)",
        }}
        animate={{
          left: isDark ? "calc(100% - 27px)" : "3px",
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />

      {/* Sun icon */}
      <motion.div
        animate={{ opacity: isDark ? 0.3 : 1, scale: isDark ? 0.8 : 1 }}
        transition={{ duration: 0.2 }}
      >
        <Sun className="w-4 h-4" style={{ color: isDark ? "hsl(220, 10%, 50%)" : "hsl(30, 90%, 40%)" }} />
      </motion.div>

      {/* Moon icon */}
      <motion.div
        animate={{ opacity: isDark ? 1 : 0.3, scale: isDark ? 1 : 0.8 }}
        transition={{ duration: 0.2 }}
      >
        <Moon className="w-4 h-4" style={{ color: isDark ? "hsl(48, 100%, 70%)" : "hsl(220, 10%, 60%)" }} />
      </motion.div>
    </motion.button>
  );
}
