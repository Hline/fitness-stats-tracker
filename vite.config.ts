import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // GitHub Pages 서브패스 및 Vercel/로컬 어디서나 404 없이 동작하도록 상대경로 지정
  plugins: [react()],
  server: {
    host: true, // 모바일 기기(동일 Wi-Fi)에서 IP로 접속 허용
    port: 3000,
    open: true
  }
});
