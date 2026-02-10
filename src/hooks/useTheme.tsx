"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // const [theme, setTheme] = useState<Theme>(() => {
  //   if (typeof window !== "undefined") {
  //     const stored = localStorage.getItem("onyx-theme") as Theme;
  //     return stored || "dark";
  //   }
  //   return "dark";
  // });
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Only access localStorage and document after the component mounts
    const stored = localStorage.getItem("onyx-theme") as Theme;
    if (stored) setTheme(stored);
    
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(stored || "dark");
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
