"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, findEmployee } from "@/lib/data";
import { canAddContribution, canEndorse, isCategory, isMember, isSafeEvidenceUrl, parseScore, reviewTypeFor, visibleContributions } from "@/lib/rules";
import { currentUser } from "@/lib/session";

export async function switchUser(formData: FormData) {
  const id = String(formData.get("id"));
  if (findEmployee(id)) (await cookies()).set("demoUser", id);
  redirect("/");
}

export async function addContribution(ownerId: string, formData: FormData) {
  const me = await currentUser();
  const owner = findEmployee(ownerId);
  if (!owner || !canAddContribution(me, owner)) throw new Error("forbidden");

  const projectId = String(formData.get("projectId"));
  const project = db.projects.find((p) => p.id === projectId);
  const summary = String(formData.get("summary") ?? "").trim();
  const evidenceUrl = String(formData.get("evidenceUrl") ?? "").trim();
  const category = String(formData.get("category"));
  if (!project || !isMember(project, owner.id)) throw new Error("invalid project");
  if (!summary) throw new Error("summary required");
  if (!isSafeEvidenceUrl(evidenceUrl)) throw new Error("evidence must be an http(s) link");
  if (!isCategory(category)) throw new Error("invalid category");

  db.contributions.push({
    id: crypto.randomUUID(),
    ownerId: owner.id,
    addedById: me.id,
    projectId,
    summary,
    impact: String(formData.get("impact") ?? "").trim(),
    evidenceUrl,
    skills: String(formData.get("skills") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    category,
    confirmed: me.id === owner.id, // manager-added → owner must confirm
    endorsedBy: [],
    createdAt: new Date().toISOString().slice(0, 10),
  });
  redirect(`/people/${owner.id}${me.id === owner.id ? "" : "?added=pending"}`);
}

export async function confirmContribution(id: string) {
  const me = await currentUser();
  const c = db.contributions.find((x) => x.id === id);
  if (!c || c.ownerId !== me.id) throw new Error("forbidden");
  c.confirmed = true;
  revalidatePath(`/people/${me.id}`);
}

export async function rejectContribution(id: string) {
  const me = await currentUser();
  const c = db.contributions.find((x) => x.id === id);
  if (!c || c.ownerId !== me.id || c.confirmed) throw new Error("forbidden");
  db.contributions = db.contributions.filter((x) => x.id !== id);
  revalidatePath(`/people/${me.id}`);
}

export async function endorse(contributionId: string) {
  const me = await currentUser();
  const c = db.contributions.find((x) => x.id === contributionId);
  const project = c && db.projects.find((p) => p.id === c.projectId);
  if (!c || !project || !canEndorse(me, c, project)) throw new Error("forbidden");
  c.endorsedBy.push(me.id);
  revalidatePath(`/projects/${project.id}`);
}

export async function submitReview(ownerId: string, formData: FormData) {
  const me = await currentUser();
  const owner = findEmployee(ownerId);
  const type = owner && reviewTypeFor(me, owner);
  if (!owner || !type) throw new Error("forbidden");

  const scores: Record<string, number> = {};
  for (const k of db.criteria) {
    const s = parseScore(String(formData.get(k.id) ?? ""));
    if (s === null) throw new Error(`invalid score for ${k.id}`);
    scores[k.id] = s;
  }
  const allowed = new Set(visibleContributions(me, owner.id, db.contributions).filter((c) => c.confirmed).map((c) => c.id));
  const evidenceIds = formData.getAll("evidence").map(String).filter((id) => allowed.has(id));

  db.reviews = db.reviews.filter((r) => !(r.revieweeId === owner.id && r.reviewerId === me.id && r.type === type));
  db.reviews.push({ revieweeId: owner.id, reviewerId: me.id, type, scores, comment: String(formData.get("comment") ?? "").trim(), evidenceIds });
  redirect(`/people/${owner.id}`);
}
