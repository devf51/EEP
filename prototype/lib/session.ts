import { cookies } from "next/headers";
import { db, findEmployee, type Employee } from "./data";

// Prototype only: the "login" is a cookie set by the header dropdown. Auth.js replaces this in build step 1.
export async function currentUser(): Promise<Employee> {
  const id = (await cookies()).get("demoUser")?.value ?? "";
  return findEmployee(id) ?? db.employees[0];
}
