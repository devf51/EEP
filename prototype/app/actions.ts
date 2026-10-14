"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CATEGORY_LABEL, db, findEmployee, type Category } from "@/lib/data";
import { canAddContribution, canEndorse, isMember, isSafeEvidenceUrl } from "@/lib/rules";
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
  if (!(category in CATEGORY_LABEL)) throw new Error("invalid category");

  db.contributions.push({
    id: crypto.randomUUID(),
    ownerId: owner.id,
    addedById: me.id,
    projectId,
    summary,
    impact: String(formData.get("impact") ?? "").trim(),
    evidenceUrl,
    skills: String(formData.get("skills") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    category: category as Category,
    confirmed: me.id === owner.id, // manager-added → owner must confirm
    endorsedBy: [],
    createdAt: new Date().toISOString().slice(0, 10),
  });
  redirect(`/people/${owner.id}`);
}

export async function confirmContribution(id: string) {
  const me = await currentUser();
  const c = db.contributions.find((x) => x.id === id);
  if (!c || c.ownerId !== me.id) throw new Error("forbidden");
  c.confirmed = true;
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
