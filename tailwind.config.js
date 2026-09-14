const uiFontFamily = ['"Segoe UI Variable"', '"Segoe UI"', 'Arial', 'sans-serif'];

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: uiFontFamily,
        // Existing data-field utilities should use the same font as the workspace.
        mono: uiFontFamily,
      },
      fontWeight: {
        bold: '600',
        extrabold: '700',
        black: '700',
      },
      colors: {
        blue: {
          50: '#E9F2FF', 100: '#CCE0FF', 200: '#B3D4FF',
          300: '#85B8FF', 400: '#579DFF', 500: '#1D7AFC',
          600: '#0C66E4', 700: '#0052CC', 800: '#0747A6',
          900: '#09326C', 950: '#092957',
        },
        slate: {
          50: '#FAFBFC', 100: '#F4F5F7', 200: '#DFE1E6',
          300: '#B3BAC5', 400: '#8590A2', 500: '#626F86',
          600: '#44546F', 700: '#344563', 800: '#253858',
          900: '#172B4D', 950: '#091E42',
        },
        border: "var(--border)",
        input: "var(--input)",
        "input-background": "var(--input-background)",
        "switch-background": "var(--switch-background)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        // Sidebar design tokens
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      borderRadius: {
        xl: '0.5rem',
        '2xl': '0.625rem',
        '3xl': '0.75rem',
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        sm: '0 1px 2px rgb(0 0 0 / 0.04)',
        DEFAULT: '0 1px 4px rgb(0 0 0 / 0.06)',
        md: '0 2px 8px rgb(0 0 0 / 0.07)',
        lg: '0 4px 16px rgb(0 0 0 / 0.08)',
        xl: '0 8px 28px rgb(0 0 0 / 0.10)',
        '2xl': '0 12px 40px rgb(0 0 0 / 0.14)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
