import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#111318",
        foreground: "#e2e2e9",
        "surface-container-highest": "#33353a",
        "surface-variant": "#33353a",
        "primary": "#9ecaff",
        "on-tertiary-fixed": "#410001",
        "on-error": "#690005",
        "on-surface": "#e2e2e9",
        "tertiary": "#ffb4a9",
        "on-secondary-container": "#6a4e00",
        "secondary-container": "#fabd00",
        "on-tertiary-container": "#5e0002",
        "inverse-surface": "#e2e2e9",
        "primary-fixed-dim": "#9ecaff",
        "on-secondary-fixed": "#261a00",
        "on-primary": "#003258",
        "surface-tint": "#9ecaff",
        "tertiary-container": "#ff5748",
        "primary-container": "#2196f3",
        "tertiary-fixed": "#ffdad5",
        "error": "#ffb4ab",
        "secondary": "#ffdf9e",
        "surface-container-lowest": "#0c0e13",
        "surface-container-low": "#1a1b21",
        "on-secondary": "#3f2e00",
        "inverse-on-surface": "#2e3036",
        "secondary-fixed-dim": "#fabd00",
        "surface-bright": "#37393f",
        "on-tertiary-fixed-variant": "#930005",
        "tertiary-fixed-dim": "#ffb4a9",
        "on-primary-fixed": "#001d36",
        "outline-variant": "#404752",
        "error-container": "#93000a",
        "surface": "#111318",
        "on-background": "#e2e2e9",
        "surface-container": "#1e2025",
        "outline": "#89919d",
        "on-primary-container": "#002c4f",
        "surface-container-high": "#282a2f",
        "on-primary-fixed-variant": "#00497d",
        "primary-fixed": "#d1e4ff",
        "on-error-container": "#ffdad6",
        "on-surface-variant": "#bfc7d4",
        "surface-dim": "#111318",
        "on-tertiary": "#690002",
        "secondary-fixed": "#ffdf9e",
        "on-secondary-fixed-variant": "#5b4300",
        "inverse-primary": "#0061a4"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      fontFamily: {
        "headline": ["Space Grotesk", "sans-serif"],
        "body": ["Manrope", "sans-serif"],
        "label": ["Space Grotesk", "sans-serif"]
      }
    },
  },
  plugins: [],
};
export default config;
