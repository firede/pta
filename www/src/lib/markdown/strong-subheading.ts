interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

/** 标记整段仅由单个加粗构成的段落，供样式作小节头处理；行内加粗不受影响。 */
export function rehypeStrongSubheading() {
  return (tree: unknown) => {
    walk(tree as HastNode);
  };
}

function walk(node: HastNode) {
  if (!node.children) return;

  for (const child of node.children) {
    if (child.type === 'element' && child.tagName === 'p' && isStrongOnly(child)) {
      child.properties = { ...child.properties, 'data-subheading': '' };
      continue;
    }
    walk(child);
  }
}

function isStrongOnly(paragraph: HastNode) {
  const significant = (paragraph.children ?? []).filter(
    (child) => !(child.type === 'text' && (child.value ?? '').trim() === ''),
  );
  const [only] = significant;
  return significant.length === 1 && only?.type === 'element' && only.tagName === 'strong';
}
