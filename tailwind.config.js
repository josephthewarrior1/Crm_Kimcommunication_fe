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
        sans: ['"Segoe UI Variable"', '"Segoe UI"', 'Arial', 'sans-serif'],
      },
      fontWeight: {
        bold: '600',
        extrabold: '700',
        black: '700',
      },
      colors: {
        blue: {
          50: '#f0f0fa', 100: '#e8e8f7', 200: '#d1d1ef',
          300: '#b4b4e2', 400: '#9293ce', 500: '#7578bd',
          600: '#5b5fc7', 700: '#4f52b2', 800: '#444791',
          900: '#383966', 950: '#292a48',
        },
        slate: {
          50: '#fafafa', 100: '#f5f5f5', 200: '#e5e5e5',
          300: '#d1d1d1', 400: '#949494', 500: '#707070',
          600: '#616161', 700: '#424242', 800: '#323232',
          900: '#242424', 950: '#161616',
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
