import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const rawBasePath = env.VITE_BASE_PATH || '/';
  const base = rawBasePath.endsWith('/') ? rawBasePath : `${rawBasePath}/`;

  return {
    plugins: [react()],
    base,
  };
});