import { serve } from 'bun';

serve({
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    try {
      return new Response(Bun.file(`.${path}`));
    } catch (error) {
      return new Response('404 Not Found', { status: 404 });
    }
  },
  port: 3000,
});

console.log('Server running at http://localhost:3000');
