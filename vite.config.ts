import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  server: {
    open: true, // Automatically opens the app in the browser
    watch: {
      usePolling: true, // Use polling if you're working in environments like WSL or Docker
    },
  },
});
