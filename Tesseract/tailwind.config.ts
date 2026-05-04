import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/pages/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#05060A",
          900: "#0A0B12",
          850: "#0E1018",
          800: "#141624",
          700: "#1C1F33",
          600: "#262A45",
          500: "#3A3F60",
        },
        neon: {
          red: "#FF3860",
          orange: "#FF8A3D",
          yellow: "#FFD93D",
          green: "#38F9A0",
          cyan: "#30E8FF",
          blue: "#4D8BFF",
          purple: "#A855F7",
          pink: "#F472B6",
        },
      },
      fontFamily: {
        display: ["var(--font-orbitron)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
      },
      backgroundImage: {
        "gradient-tesseract":
          "linear-gradient(90deg,#FF3860 0%,#FFD93D 25%,#38F9A0 50%,#30E8FF 75%,#A855F7 100%)",
        "gradient-tesseract-soft":
          "linear-gradient(135deg,rgba(255,56,96,.25) 0%,rgba(255,217,61,.25) 25%,rgba(56,249,160,.25) 50%,rgba(48,232,255,.25) 75%,rgba(168,85,247,.25) 100%)",
        "gradient-radial":
          "radial-gradient(ellipse at center, var(--tw-gradient-stops))",
        "grid-faint":
          "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
      },
      boxShadow: {
        "glow-sm": "0 0 20px -5px rgba(168,85,247,0.35)",
        "glow-md":
          "0 0 30px -5px rgba(168,85,247,0.45),0 0 80px -20px rgba(48,232,255,0.35)",
        "glow-lg":
          "0 0 50px -5px rgba(168,85,247,0.5),0 0 120px -25px rgba(48,232,255,0.4)",
        "inner-glow": "inset 0 0 20px -5px rgba(168,85,247,0.25)",
      },
      animation: {
        "gradient-pan": "gradientPan 8s ease-in-out infinite",
        "gradient-shift": "gradientShift 12s linear infinite",
        "float-slow": "float 6s ease-in-out infinite",
        "float-slower": "float 10s ease-in-out infinite",
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
        "spin-slow": "spin 18s linear infinite",
        marquee: "marquee 40s linear infinite",
        shimmer: "shimmer 2.2s linear infinite",
        "rank-up": "rankUp 0.6s cubic-bezier(.2,.8,.2,1) both",
      },
      keyframes: {
        gradientPan: {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        gradientShift: {
          "0%": { backgroundPosition: "0% 0%" },
          "100%": { backgroundPosition: "200% 0%" },
        },
        float: {
          "0%,100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-12px) rotate(1.5deg)" },
        },
        pulseGlow: {
          "0%,100%": {
            boxShadow:
              "0 0 20px -5px rgba(168,85,247,0.45),0 0 60px -20px rgba(48,232,255,0.35)",
          },
          "50%": {
            boxShadow:
              "0 0 35px -5px rgba(168,85,247,0.65),0 0 90px -15px rgba(48,232,255,0.5)",
          },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        rankUp: {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      backgroundSize: {
        "grid-32": "32px 32px",
        "grid-48": "48px 48px",
      },
    },
  },
  plugins: [],
};

export default config;
