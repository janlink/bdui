import { readBdJson, runBd } from './client';

export interface CreateIssueParams {
  title: string;
  description?: string;
  priority?: number;
  issueType?: 'task' | 'epic' | 'bug' | 'feature' | 'chore' | 'decision';
  assignee?: string;
  labels?: string[];
  parent?: string;
}

export interface UpdateIssueParams {
  id: string;
  title?: string;
  description?: string;
  priority?: number;
  status?: string;
  assignee?: string;
  labels?: string[];
}

export interface CloseIssueParams {
  id: string;
  reason?: string;
}

type IssueDto = Record<string, unknown>;
type ReadJson = typeof readBdJson;

export interface BdListOptions {
  cwd?: string;
  readJson?: ReadJson;
}

function currentWorkspace(): string {
  return process.cwd();
}

/** Create an issue with the current bd CLI. */
export async function createIssue(params: CreateIssueParams): Promise<string> {
  const args = ['create', params.title, '--json'];

  if (params.description !== undefined) args.push('--description', params.description);
  if (params.priority !== undefined) args.push('--priority', String(params.priority));
  if (params.issueType) args.push('--type', params.issueType);
  if (params.assignee) args.push('--assignee', params.assignee);
  if (params.labels?.length) args.push('--labels', params.labels.join(','));
  if (params.parent) args.push('--parent', params.parent);

  const value = await readBdJson(args, currentWorkspace());
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('bd create returned unexpected JSON');
  }

  const id = (value as IssueDto).id;
  if (typeof id !== 'string' || !id) throw new Error('bd create did not return an issue id');
  return id;
}

export async function closeIssue(params: CloseIssueParams): Promise<void>;
export async function closeIssue(id: string, reason?: string): Promise<void>;
export async function closeIssue(paramsOrId: CloseIssueParams | string, reason?: string): Promise<void> {
  const params = typeof paramsOrId === 'string' ? { id: paramsOrId, reason } : paramsOrId;
  const args = ['close', params.id, '--json'];
  if (params.reason !== undefined) args.push('--reason', params.reason);
  await runBd(args, { cwd: currentWorkspace() });
}

export async function updateIssue(params: UpdateIssueParams): Promise<void>;
export async function updateIssue(id: string, params: Omit<UpdateIssueParams, 'id'>): Promise<void>;
export async function updateIssue(
  paramsOrId: UpdateIssueParams | string,
  changes?: Omit<UpdateIssueParams, 'id'>,
): Promise<void> {
  const params = typeof paramsOrId === 'string' ? { ...changes, id: paramsOrId } : paramsOrId;
  const shouldClose = params.status === 'closed';
  const args = ['update', params.id, '--json'];

  if (params.title !== undefined) args.push('--title', params.title);
  if (params.description !== undefined) args.push('--description', params.description);
  if (params.priority !== undefined) args.push('--priority', String(params.priority));
  if (params.status !== undefined && !shouldClose) args.push('--status', params.status);
  if (params.assignee !== undefined) args.push('--assignee', params.assignee);
  if (params.labels !== undefined) args.push('--set-labels', params.labels.join(','));

  if (args.length > 3) await runBd(args, { cwd: currentWorkspace() });
  if (shouldClose) await closeIssue(params.id);
}

async function listIssueDtos(options: BdListOptions = {}): Promise<IssueDto[]> {
  const readJson = options.readJson ?? readBdJson;
  const value = await readJson(
    ['list', '--all', '--limit', '0', '--json'],
    options.cwd ?? currentWorkspace(),
  );
  if (!Array.isArray(value)) throw new Error('bd list returned JSON that is not an array');
  return value.filter((item): item is IssueDto =>
    typeof item === 'object' && item !== null && !Array.isArray(item),
  );
}

export async function getAssignees(options: BdListOptions = {}): Promise<string[]> {
  const assignees = new Set<string>();
  for (const issue of await listIssueDtos(options)) {
    if (typeof issue.assignee === 'string' && issue.assignee) assignees.add(issue.assignee);
  }
  return [...assignees].sort();
}

export async function getLabels(options: BdListOptions = {}): Promise<string[]> {
  const labels = new Set<string>();
  for (const issue of await listIssueDtos(options)) {
    if (!Array.isArray(issue.labels)) continue;
    for (const label of issue.labels) {
      if (typeof label === 'string') labels.add(label);
    }
  }
  return [...labels].sort();
}
