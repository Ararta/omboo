import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Omboo brand palette, matched to the live omboo.am marketing site (--ink/--offwhite/
        // --coral/--gray-300/--gray-500).
        ink: "#241619",
        paper: "#FBF6F0",
        seal: "#A6192E",
        line: "#E4D5D1",
        muted: "#8C7A78",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
