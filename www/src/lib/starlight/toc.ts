import { defineRouteMiddleware } from '@astrojs/starlight/route-data';

export const onRequest = defineRouteMiddleware((context) => {
  const { starlightRoute } = context.locals;

  // 典籍布局不使用常驻侧栏：全站导航由目录抽屉承担，正文栏居中。
  starlightRoute.hasSidebar = false;

  const { toc } = starlightRoute;
  if (!toc) return;

  toc.items = toc.items.filter((item) => item.slug !== 'footnote-label');
});
