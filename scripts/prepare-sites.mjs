import { copyFile, mkdir, writeFile } from 'node:fs/promises';

const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebaseapp.com; frame-src 'self' https://*.firebaseapp.com; worker-src 'self' blob:; manifest-src 'self'; media-src 'none'; upgrade-insecure-requests",
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

// Sites는 서버 진입점이 있는 배포 번들을 사용합니다. Vite의 정적 자산은
// ASSETS 바인딩으로 제공하고, React Router 경로는 index.html로 폴백합니다.
await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });

await writeFile(
  'dist/server/index.js',
  `export default {
  async fetch(request, env) {
    const secure = (response) => {
      const securedResponse = new Response(response.body, response);
      const headers = ${JSON.stringify(securityHeaders)};
      for (const [name, value] of Object.entries(headers)) {
        securedResponse.headers.set(name, value);
      }
      return securedResponse;
    };

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || request.method !== 'GET') return secure(response);

    const indexUrl = new URL('/index.html', request.url);
    return secure(await env.ASSETS.fetch(new Request(indexUrl, request)));
  },
};
`,
  'utf8',
);

await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json');
