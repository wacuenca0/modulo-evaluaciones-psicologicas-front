import { RenderMode, ServerRoute } from '@angular/ssr';

// Use Server rendering for all routes to avoid prerendering parameterized routes.
// Add targeted prerender entries later if needed.
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Server
  }
];
