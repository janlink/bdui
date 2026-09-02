export interface DependencyEdge {
  issue_id: string;
  depends_on_id: string;
  type: string;
  [key: string]: unknown;
}

// Normalized from bd's public JSON output.
export interface IssueProgress {
  closed: number;
  total: number;
  percent: number;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: string;
  displayStatus: string;
  priority: number; // 0-4 (0=highest, 4=lowest)
  issue_type: string;
  assignee?: string | null;
  labels?: string[]; // From labels table
  created_at: string;
  updated_at: string;
  closed_at?: string | null;

  // Raw bd dependency edges plus derived relationships.
  dependencies: DependencyEdge[];
  parent?: string;
  children?: string[];
  progress?: IssueProgress;
  blockedBy?: string[];
  blocks?: string[];
}

export interface BeadsData {
  issues: Issue[];
  byStatus: Record<string, Issue[]>;
  byId: Map<string, Issue>;
  stats: {
    total: number;
    open: number;
    closed: number;
    blocked: number;
  };
}
