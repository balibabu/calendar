import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/calendar/',
  plugins: [tailwindcss()]
});
