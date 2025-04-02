import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  return {
    plugins: [react()],
    server: {
      proxy: {
          target: "http://localhost:5001",
      },
    },
  };
});
