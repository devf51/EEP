import type { Contribution, Criterion, Employee, Project } from "./data.ts";

export function isMember(p: Project, employeeId: string): boolean {
  return p.members.some((m) => m.employeeId === employeeId);
}

export function canViewPortfolio(viewer: Employee, owner: Employee): boolean {
  return viewer.id === owner.id || viewer.role === "hr" || owner.managerId === viewer.id;
}

export function canAddContribution(viewer: Employee, owner: Employee): boolean {
  return viewer.id === owner.id || owner.managerId === viewer.id;
}

export function canViewProject(viewer: Employee, p: Project): boolean {
  return viewer.role === "hr" || isMember(p, viewer.id);
}

export function canEndorse(viewer: Employee, c: Contribution, p: Project): boolean {
  return c.confirmed && c.ownerId !== viewer.id && isMember(p, viewer.id) && !c.endorsedBy.includes(viewer.id);
}

export function reviewTypeFor(viewer: Employee, owner: Employee): "self" | "manager" | null {
  if (viewer.id === owner.id) return "self";
  if (owner.managerId === viewer.id) return "manager";
  return null;
}

// Unconfirmed (manager-added) items are shown only to their owner, who must confirm them.
export function visibleContributions(viewer: Employee, ownerId: string, all: Contribution[]): Contribution[] {
  return all.filter((c) => c.ownerId === ownerId && (c.confirmed || viewer.id === ownerId));
}

export function isSafeEvidenceUrl(url: string): boolean {
  if (url === "") return true;
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

export function parseScore(raw: string): number | null {
  const n = Number(raw);
  return raw !== "" && Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

export function weightedScore(scores: Record<string, number>, criteria: Criterion[]): number {
  const total = criteria.reduce((s, k) => s + k.weight, 0);
  const sum = criteria.reduce((s, k) => s + (scores[k.id] ?? 0) * k.weight, 0);
  return Math.round((sum / total) * 100) / 100;
}
