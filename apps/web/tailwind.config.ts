import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#15231d",
        field: "#f6f8f4",
        line: "#d9e1d6",
        pine: "#1f5d45",
      },
    },
  },
  plugins: [],
};

export default config;
