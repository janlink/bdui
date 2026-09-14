import type { Issue } from '../types';

// Grammar: `type:`, `label:`, `priority:` and bare `p0`-`p4` are structured
// facets (ANDed across categories, ORed within one); the rest are free-text
// words, each required as a substring (all ANDed).
export interface ParsedQuery {
  types: string[];
  labels: string[];
  priorities: number[];
  terms: string[];
}

const PRIORITY_SHORTHAND = /^p([0-4])$/;

export function parseSearchQuery(query: string): ParsedQuery {
  const types: string[] = [];
  const labels: string[] = [];
  const priorities: number[] = [];
  const terms: string[] = [];

  for (const token of query.trim().split(/\s+/)) {
    if (!token) continue;

    const colon = token.indexOf(':');
    if (colon > 0) {
      const key = token.slice(0, colon).toLowerCase();
      const value = token.slice(colon + 1).toLowerCase();
      if (!value) continue;
      if (key === 'type') { types.push(value); continue; }
      if (key === 'label') { labels.push(value); continue; }
      if (key === 'priority') {
        const parsed = Number.parseInt(value, 10);
        if (parsed >= 0 && parsed <= 4) priorities.push(parsed);
        continue;
      }
    }

    const shorthand = PRIORITY_SHORTHAND.exec(token.toLowerCase());
    if (shorthand) { priorities.push(Number.parseInt(shorthand[1], 10)); continue; }

    terms.push(token.toLowerCase());
  }

  return { types, labels, priorities, terms };
}

export function hasQueryTerms(parsed: ParsedQuery): boolean {
  return !!(parsed.types.length || parsed.labels.length || parsed.priorities.length || parsed.terms.length);
}

export function issueMatchesParsedQuery(issue: Issue, parsed: ParsedQuery): boolean {
  if (parsed.types.length && !parsed.types.includes(issue.issue_type.toLowerCase())) return false;
  if (parsed.priorities.length && !parsed.priorities.includes(issue.priority)) return false;
  if (parsed.labels.length) {
    const labels = (issue.labels ?? []).map(label => label.toLowerCase());
    if (!parsed.labels.some(label => labels.includes(label))) return false;
  }

  if (parsed.terms.length) {
    const haystack = [
      issue.id,
      issue.title,
      issue.description,
      issue.assignee ?? '',
      issue.notes ?? '',
      (issue.labels ?? []).join(' '),
    ].join(' ').toLowerCase();
    if (!parsed.terms.every(term => haystack.includes(term))) return false;
  }

  return true;
}
