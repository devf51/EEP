"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findEmployee } from "@/lib/data";

export async function switchUser(formData: FormData) {
  const id = String(formData.get("id"));
  if (findEmployee(id)) (await cookies()).set("demoUser", id);
  redirect("/");
}
