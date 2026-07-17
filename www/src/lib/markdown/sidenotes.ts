interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

/**
 * 脚注转页边旁注：定义内容就近复制到引用点之后，宽屏时浮入页边，
 * 窄屏保持隐藏、仍由页尾脚注区呈现。聚合的脚注区维持原样，两处按宽度取舍。
 */
export function rehypeSidenotes() {
  return (tree: unknown) => {
    const root = tree as HastNode;
    const definitions = collectDefinitions(root);
    if (definitions.size === 0) return;
    placeSidenotes(root, definitions);
  };
}

/** 收集脚注定义：id 后缀 → 定义内容（剔除回链）。 */
function collectDefinitions(root: HastNode) {
  const definitions = new Map<string, HastNode[]>();
  const section = findNode(
    root,
    (node) => node.tagName === 'section' && hasDataProperty(node, 'dataFootnotes'),
  );
  if (!section) return definitions;

  walk(section, (node) => {
    if (node.tagName !== 'li' || typeof node.properties?.id !== 'string') return;
    const match = /^user-content-fn-(.+)$/.exec(node.properties.id);
    if (!match) return;

    const firstBlock = node.children?.find((child) => child.type === 'element');
    const content = (firstBlock?.children ?? node.children ?? []).filter(
      (child) => !(child.type === 'element' && hasDataProperty(child, 'dataFootnoteBackref')),
    );
    definitions.set(match[1], content);
  });
  return definitions;
}

/** 在每个脚注引用 <sup> 之后插入旁注副本。 */
function placeSidenotes(node: HastNode, definitions: Map<string, HastNode[]>) {
  if (!node.children) return;

  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    if (child.type !== 'element') continue;

    if (child.tagName === 'sup') {
      const ref = findNode(
        child,
        (candidate) => candidate.tagName === 'a' && hasDataProperty(candidate, 'dataFootnoteRef'),
      );
      const href = ref?.properties?.href;
      if (typeof href === 'string') {
        const match = /^#user-content-fn-(.+)$/.exec(href);
        const definition = match ? definitions.get(match[1]) : undefined;
        const label = ref ? textContent(ref).trim() : '';
        if (definition) {
          node.children.splice(index + 1, 0, {
            type: 'element',
            tagName: 'span',
            properties: { className: ['sidenote'], 'data-pagefind-ignore': true },
            children: [
              {
                type: 'element',
                tagName: 'span',
                properties: { className: ['sidenote-num'] },
                children: [{ type: 'text', value: label }],
              },
              ...definition,
            ],
          });
          index += 1;
          continue;
        }
      }
    }

    placeSidenotes(child, definitions);
  }
}

function hasDataProperty(node: HastNode, name: string) {
  if (!node.properties) return false;
  if (name in node.properties) return true;
  // 兼容序列化形态：dataFootnoteRef ↔ data-footnote-ref
  const kebab = name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
  return kebab in node.properties;
}

function findNode(node: HastNode, predicate: (node: HastNode) => boolean): HastNode | undefined {
  if (node.type === 'element' && predicate(node)) return node;
  for (const child of node.children ?? []) {
    const found = findNode(child, predicate);
    if (found) return found;
  }
  return undefined;
}

function walk(node: HastNode, visit: (node: HastNode) => void) {
  if (node.type === 'element') visit(node);
  for (const child of node.children ?? []) walk(child, visit);
}

function textContent(node: HastNode): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(textContent).join('');
}
