import { copyFile, mkdir, writeFile } from 'node:fs/promises';

// Sites는 서버 진입점이 있는 배포 번들을 사용합니다. Vite의 정적 자산은
// ASSETS 바인딩으로 제공하고, React Router 경로는 index.html로 폴백합니다.
await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });

await writeFile(
  'dist/server/index.js',
  `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || request.method !== 'GET') return response;

    const indexUrl = new URL('/index.html', request.url);
    return env.ASSETS.fetch(new Request(indexUrl, request));
  },
};
`,
  'utf8',
);

await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json');
