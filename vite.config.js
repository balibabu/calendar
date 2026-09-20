import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/calendar/',
  plugins: [tailwindcss()],
  preview: {
    allowedHosts: ['tester.balibabu.com.np']
  }
});
