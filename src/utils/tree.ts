import type { BeadsData, Issue } from '../types';

export interface TreeNode {
  issue: Issue;
  children: TreeNode[];
  depth: number;
}

export interface FlatNode {
  issue: Issue;
  depth: number;
  isLast: boolean;
  prefix: string;
}

// Build the parent/child hierarchy, then prune it to the visible set. Hidden
// nodes are dropped and their visible descendants are lifted to the hidden
// node's position, so the tree stays connected and correctly indented.
export function buildVisibleTree(data: BeadsData, visibleIds: Set<string>): TreeNode[] {
  const { byId } = data;
  const processed = new Set<string>();

  const rootIssues = data.issues.filter(issue => !issue.parent || !byId.has(issue.parent));

  function build(issue: Issue, depth: number): TreeNode {
    processed.add(issue.id);
    const node: TreeNode = { issue, children: [], depth };
    for (const childId of issue.children ?? []) {
      const child = byId.get(childId);
      if (child && !processed.has(childId)) {
        node.children.push(build(child, depth + 1));
      }
    }
    return node;
  }

  const roots: TreeNode[] = [];
  for (const issue of rootIssues) {
    if (!processed.has(issue.id)) roots.push(build(issue, 0));
  }

  function prune(nodes: TreeNode[], depth: number): TreeNode[] {
    const out: TreeNode[] = [];
    for (const node of nodes) {
      if (visibleIds.has(node.issue.id)) {
        node.depth = depth;
        node.children = prune(node.children, depth + 1);
        out.push(node);
      } else {
        out.push(...prune(node.children, depth));
      }
    }
    return out;
  }

  return prune(roots, 0);
}

export function flattenTree(roots: TreeNode[]): FlatNode[] {
  const flat: FlatNode[] = [];

  function traverse(node: TreeNode, prefix: string, isLast: boolean) {
    flat.push({ issue: node.issue, depth: node.depth, isLast, prefix });

    for (let i = 0; i < node.children.length; i++) {
      const childIsLast = i === node.children.length - 1;
      const verticalLine = isLast ? '   ' : '│  ';
      traverse(node.children[i], prefix + verticalLine, childIsLast);
    }
  }

  for (let i = 0; i < roots.length; i++) {
    traverse(roots[i], '', i === roots.length - 1);
  }

  return flat;
}

// bd list-style flattening: each root's subtree is drawn independently, so
// children sit directly under their root without a vertical line climbing to
// the next root. Inner levels still get proper connectors.
export function flattenList(roots: TreeNode[]): FlatNode[] {
  const flat: FlatNode[] = [];

  function traverse(node: TreeNode, depth: number, isLast: boolean, prefix: string) {
    flat.push({ issue: node.issue, depth, isLast, prefix });

    const childPrefix = prefix + (depth === 0 ? '' : isLast ? '   ' : '│  ');
    node.children.forEach((child, i) =>
      traverse(child, depth + 1, i === node.children.length - 1, childPrefix),
    );
  }

  roots.forEach((root, i) => traverse(root, 0, i === roots.length - 1, ''));
  return flat;
}
