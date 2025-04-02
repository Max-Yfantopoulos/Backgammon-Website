import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: isProduction
            ? "https://backgammon-website.onrender.com"
            : "http://localhost:5001",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
