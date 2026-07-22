import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const emulatorCspPlugin = {
  name: 'careerfit-emulator-csp',
  transformIndexHtml(html, context) {
    if (context.server?.config.mode !== 'emulator') return html;
    return html.replace(
      "connect-src 'self'",
      "connect-src 'self' http://127.0.0.1:8080 http://127.0.0.1:9099 ws://127.0.0.1:8080 ws://127.0.0.1:9099",
    );
  },
};

export default defineConfig({
  plugins: [react(), emulatorCspPlugin],
  base: '/',
});
