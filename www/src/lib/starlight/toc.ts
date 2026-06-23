import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

export const onRequest = defineRouteMiddleware((context) => {
  const { toc } = context.locals.starlightRoute;

  if (!toc) return;

  toc.items = toc.items.filter((item) => item.slug !== 'footnote-label');
});
