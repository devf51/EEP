import { test } from "node:test";
import assert from "node:assert/strict";
import { allowSignIn, can, normalizeEmail, validateEmployeeChange, wouldCreateCycle, type Actor } from "./rules.ts";

const actor = (id: string, roles: Actor["roles"] = []): Actor => ({ id, roles });
const person = (id: string, managerId: string | null) => ({ id, managerId });

test("employee.view: self, direct manager, HR, admin; not peer or skip-level", () => {
  const mali = person("mali", "somchai");
  assert.equal(can(actor("mali"), "employee.view", mali), true);
  assert.equal(can(actor("somchai"), "employee.view", mali), true);
  assert.equal(can(actor("ton"), "employee.view", mali), false);
  assert.equal(can(actor("director"), "employee.view", mali), false); // manager's manager
  assert.equal(can(actor("nok", ["HR"]), "employee.view", mali), true);
  assert.equal(can(actor("root", ["ADMIN"]), "employee.view", mali), true);
  assert.equal(can(actor("mali"), "employee.view"), false); // no target
});

test("employee.manage: HR or admin, never on own record", () => {
  assert.equal(can(actor("nok", ["HR"]), "employee.manage"), true);
  assert.equal(can(actor("root", ["ADMIN"]), "employee.manage"), true);
  assert.equal(can(actor("somchai"), "employee.manage"), false);
  assert.equal(can(actor("nok", ["HR"]), "employee.manage", person("nok", null)), false);
  assert.equal(can(actor("nok", ["HR"]), "employee.manage", person("mali", "somchai")), true);
});

test("department.manage: HR or admin; audit.view: admin only", () => {
  assert.equal(can(actor("nok", ["HR"]), "department.manage"), true);
  assert.equal(can(actor("mali"), "department.manage"), false);
  assert.equal(can(actor("root", ["ADMIN"]), "audit.view"), true);
  assert.equal(can(actor("nok", ["HR"]), "audit.view"), false);
});

test("role changes: HR grants HR, only admin touches ADMIN, nobody edits self", () => {
  const hr = actor("nok", ["HR"]);
  const admin = actor("root", ["ADMIN"]);
  assert.equal(validateEmployeeChange(hr, "mali", [], ["HR"]), null);
  assert.equal(validateEmployeeChange(hr, null, [], []), null); // create
  assert.match(validateEmployeeChange(hr, "mali", [], ["ADMIN"]) ?? "", /แอดมิน/);
  assert.match(validateEmployeeChange(hr, null, [], ["ADMIN"]) ?? "", /แอดมิน/);
  assert.match(validateEmployeeChange(hr, "root2", ["ADMIN"], ["ADMIN"]) ?? "", /แอดมิน/); // HR editing an admin
  assert.equal(validateEmployeeChange(hr, "root2", ["ADMIN"], []), "เฉพาะแอดมินเท่านั้นที่แก้ข้อมูลของแอดมินได้"); // HR cannot demote an admin
  assert.equal(validateEmployeeChange(admin, "root2", ["ADMIN"], []), null);
  assert.equal(validateEmployeeChange(admin, "mali", [], ["ADMIN", "HR"]), null);
  assert.match(validateEmployeeChange(admin, "root", ["ADMIN"], ["ADMIN"]) ?? "", /ตัวเอง/);
  assert.match(validateEmployeeChange(actor("somchai"), "mali", [], []) ?? "", /สิทธิ์/);
});

test("reporting line: refuse cycles, terminate on bad data", () => {
  const managerOf = new Map<string, string | null>([["a", null], ["b", "a"], ["c", "b"]]);
  assert.equal(wouldCreateCycle("a", "a", managerOf), true);
  assert.equal(wouldCreateCycle("a", "c", managerOf), true);
  assert.equal(wouldCreateCycle("c", "a", managerOf), false);
  assert.equal(wouldCreateCycle("b", null, managerOf), false);
  const broken = new Map<string, string | null>([["x", "y"], ["y", "x"]]);
  assert.equal(wouldCreateCycle("z", "x", broken), false);
});

test("sign-in: active registered employee only; Google email must be verified", () => {
  assert.equal(allowSignIn(null, "google", true), false);
  assert.equal(allowSignIn({ active: false }, "google", true), false);
  assert.equal(allowSignIn({ active: true }, "google", undefined), false);
  assert.equal(allowSignIn({ active: true }, "google", false), false);
  assert.equal(allowSignIn({ active: true }, "google", true), true);
  assert.equal(allowSignIn({ active: true }, "dev", undefined), true);
  // deny by default: unknown/missing provider, and non-boolean verified flag
  assert.equal(allowSignIn({ active: true }, undefined, true), false);
  assert.equal(allowSignIn({ active: true }, "github", true), false);
  assert.equal(allowSignIn({ active: true }, "google", "true"), false);
});

test("email is trimmed and lowercased", () => {
  assert.equal(normalizeEmail("  Mali@Example.COM "), "mali@example.com");
});
