import { test } from "node:test";
import assert from "node:assert/strict";
import { db } from "./data.ts";
import {
  canAddContribution, canEndorse, isCategory, canViewPortfolio, canViewProject, isSafeEvidenceUrl,
  parseScore, reviewTypeFor, visibleContributions, weightedScore,
} from "./rules.ts";

const emp = (id: string) => db.employees.find((e) => e.id === id)!;
const proj = (id: string) => db.projects.find((p) => p.id === id)!;
const con = (id: string) => db.contributions.find((c) => c.id === id)!;

test("portfolio: own yes, peer no, manager of report yes, HR yes", () => {
  assert.equal(canViewPortfolio(emp("e1"), emp("e1")), true);
  assert.equal(canViewPortfolio(emp("e1"), emp("e2")), false);
  assert.equal(canViewPortfolio(emp("m1"), emp("e1")), true);
  assert.equal(canViewPortfolio(emp("m1"), emp("hr1")), false);
  assert.equal(canViewPortfolio(emp("hr1"), emp("e3")), true);
});

test("add contribution: self or own manager only", () => {
  assert.equal(canAddContribution(emp("e1"), emp("e1")), true);
  assert.equal(canAddContribution(emp("m1"), emp("e1")), true);
  assert.equal(canAddContribution(emp("e2"), emp("e1")), false);
  assert.equal(canAddContribution(emp("hr1"), emp("e1")), false);
});

test("project: members and HR only", () => {
  assert.equal(canViewProject(emp("e3"), proj("p1")), false);
  assert.equal(canViewProject(emp("e2"), proj("p1")), true);
  assert.equal(canViewProject(emp("hr1"), proj("p1")), true);
});

test("manager-added item visible only to owner until confirmed", () => {
  const ids = (viewer: string) => visibleContributions(emp(viewer), "e3", db.contributions).map((c) => c.id);
  assert.deepEqual(ids("e3"), ["c5"]);
  assert.deepEqual(ids("m1"), []);
  assert.deepEqual(ids("hr1"), []);
});

test("endorse: not own, not twice, members only, confirmed only", () => {
  assert.equal(canEndorse(emp("e1"), con("c1"), proj("p1")), false); // own
  assert.equal(canEndorse(emp("e2"), con("c1"), proj("p1")), false); // already endorsed
  assert.equal(canEndorse(emp("e3"), con("c4"), proj("p1")), false); // not a member
  assert.equal(canEndorse(emp("e1"), con("c4"), proj("p1")), true);
  assert.equal(canEndorse(emp("e1"), con("c5"), proj("p2")), false); // pending
  const byM1 = { ...con("c4"), ownerId: "e1", addedById: "m1", projectId: "p1", confirmed: true, endorsedBy: [] };
  assert.equal(canEndorse(emp("m1"), byM1, proj("p1")), false); // adder can't endorse
});

test("category: own keys only", () => {
  assert.equal(isCategory("docs"), true);
  for (const k of ["__proto__", "toString", "constructor"]) assert.equal(isCategory(k), false);
});

test("review type: self, own manager, nobody else", () => {
  assert.equal(reviewTypeFor(emp("e1"), emp("e1")), "self");
  assert.equal(reviewTypeFor(emp("m1"), emp("e1")), "manager");
  assert.equal(reviewTypeFor(emp("e2"), emp("e1")), null);
  assert.equal(reviewTypeFor(emp("hr1"), emp("e1")), null);
});

test("evidence url: http(s) or empty only", () => {
  assert.equal(isSafeEvidenceUrl(""), true);
  assert.equal(isSafeEvidenceUrl("https://github.com/x/y/pull/1"), true);
  assert.equal(isSafeEvidenceUrl("javascript:alert(1)"), false);
  assert.equal(isSafeEvidenceUrl("not a url"), false);
});

test("score: integer 1-5 only", () => {
  assert.equal(parseScore("5"), 5);
  assert.equal(parseScore("1"), 1);
  assert.equal(parseScore("0"), null);
  assert.equal(parseScore("6"), null);
  assert.equal(parseScore("3.5"), null);
  assert.equal(parseScore("abc"), null);
  assert.equal(parseScore(""), null);
});

test("weighted score uses criterion weights", () => {
  assert.equal(weightedScore({ k1: 3, k2: 3, k3: 3 }, db.criteria), 3);
  assert.equal(weightedScore({ k1: 5, k2: 5, k3: 0 }, db.criteria), 4);
});
