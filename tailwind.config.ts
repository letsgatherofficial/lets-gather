import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a", // slate-900
        graphite: "#475569", // slate-600
        mist: "#f8fafc", // slate-50
        ember: "#f43f5e", // rose-500 (modern coral/rose)
        jade: "#10b981", // emerald-500 (modern emerald)
        brass: "#6366f1", // indigo-500 (luxurious indigo)
        primary: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        }
      },
      boxShadow: {
        glass: "0 20px 25px -5px rgba(0, 0, 0, 0.03), 0 10px 10px -5px rgba(0, 0, 0, 0.02)",
        line: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
      }
    }
  },
  plugins: []
};

export default config;
