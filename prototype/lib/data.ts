export const ROLE_LABEL = { employee: "พนักงาน", manager: "หัวหน้า", hr: "HR" } as const;
export type Role = keyof typeof ROLE_LABEL;

export const CATEGORY_LABEL = {
  delivery: "ส่งมอบงาน",
  "code-review": "รีวิวโค้ด",
  mentoring: "สอน/พี่เลี้ยง",
  docs: "ดูแลเอกสาร",
  other: "อื่นๆ",
} as const;
export type Category = keyof typeof CATEGORY_LABEL;

export type Employee = { id: string; name: string; title: string; role: Role; managerId: string | null };
export type Project = { id: string; name: string; members: { employeeId: string; role: string }[] };
export type Contribution = {
  id: string;
  ownerId: string;
  addedById: string;
  projectId: string;
  summary: string;
  impact: string;
  evidenceUrl: string;
  skills: string[];
  category: Category;
  confirmed: boolean;
  endorsedBy: string[];
  createdAt: string;
};
export type Criterion = { id: string; label: string; weight: number };
export type Review = {
  revieweeId: string;
  reviewerId: string;
  type: "self" | "manager";
  scores: Record<string, number>;
  comment: string;
  evidenceIds: string[];
};

// ponytail: in-memory store, resets when the dev server restarts. Replaced by Prisma + Postgres in build step 1.
export const db: {
  employees: Employee[];
  projects: Project[];
  contributions: Contribution[];
  criteria: Criterion[];
  reviews: Review[];
} = {
  employees: [
    { id: "hr1", name: "นก", title: "HR Partner", role: "hr", managerId: null },
    { id: "m1", name: "สมชาย", title: "Engineering Manager", role: "manager", managerId: null },
    { id: "e1", name: "มะลิ", title: "Backend Developer", role: "employee", managerId: "m1" },
    { id: "e2", name: "ต้น", title: "Frontend Developer", role: "employee", managerId: "m1" },
    { id: "e3", name: "พลอย", title: "QA Engineer", role: "employee", managerId: "m1" },
  ],
  projects: [
    {
      id: "p1",
      name: "ระบบชำระเงินใหม่",
      members: [
        { employeeId: "m1", role: "หัวหน้าโปรเจกต์" },
        { employeeId: "e1", role: "Backend" },
        { employeeId: "e2", role: "Frontend" },
      ],
    },
    {
      id: "p2",
      name: "คู่มือ onboarding",
      members: [
        { employeeId: "e1", role: "พี่เลี้ยง" },
        { employeeId: "e3", role: "เขียนคู่มือทดสอบ" },
      ],
    },
  ],
  contributions: [
    {
      id: "c1", ownerId: "e1", addedById: "e1", projectId: "p1",
      summary: "แก้ bug คิวชำระเงินค้างตอน peak",
      impact: "เคสลูกค้าร้องเรียนลดลง ~40 เคส/สัปดาห์",
      evidenceUrl: "https://github.com/example/pay/pull/412",
      skills: ["Python", "Debugging"], category: "delivery",
      confirmed: true, endorsedBy: ["e2"], createdAt: "2026-03-12",
    },
    {
      id: "c2", ownerId: "e1", addedById: "e1", projectId: "p1",
      summary: "รีวิว PR ของทีมตลอดไตรมาส",
      impact: "จับ race condition ได้ 2 จุดก่อนขึ้น production",
      evidenceUrl: "https://github.com/example/pay/pulls?q=reviewed-by%3Amali",
      skills: ["Code review"], category: "code-review",
      confirmed: true, endorsedBy: [], createdAt: "2026-06-30",
    },
    {
      id: "c3", ownerId: "e1", addedById: "e1", projectId: "p2",
      summary: "พาน้องใหม่ 2 คนขึ้นระบบ",
      impact: "น้องใหม่ปล่อยงานแรกได้ในสัปดาห์ที่ 2",
      evidenceUrl: "",
      skills: ["Mentoring"], category: "mentoring",
      confirmed: true, endorsedBy: ["e3"], createdAt: "2026-08-01",
    },
    {
      id: "c4", ownerId: "e2", addedById: "e2", projectId: "p1",
      summary: "ทำหน้า checkout ใหม่",
      impact: "conversion เพิ่ม 3%",
      evidenceUrl: "https://www.figma.com/file/example",
      skills: ["React"], category: "delivery",
      confirmed: true, endorsedBy: [], createdAt: "2026-05-20",
    },
    {
      id: "c5", ownerId: "e3", addedById: "m1", projectId: "p2",
      summary: "เขียนคู่มือทดสอบ regression",
      impact: "ทีมรันเทสต์เองได้ ไม่ต้องรอ QA",
      evidenceUrl: "https://docs.example.com/qa-guide",
      skills: ["Docs"], category: "docs",
      confirmed: false, endorsedBy: [], createdAt: "2026-09-15",
    },
  ],
  criteria: [
    { id: "k1", label: "คุณภาพงาน", weight: 40 },
    { id: "k2", label: "ผลกระทบต่อทีม/ลูกค้า", weight: 40 },
    { id: "k3", label: "การช่วยเหลือและพัฒนาคนอื่น", weight: 20 },
  ],
  reviews: [
    {
      revieweeId: "e1", reviewerId: "e1", type: "self",
      scores: { k1: 3, k2: 3, k3: 3 },
      comment: "ทำตามที่ได้รับมอบหมาย",
      evidenceIds: ["c1"],
    },
  ],
};

export function findEmployee(id: string): Employee | undefined {
  return db.employees.find((e) => e.id === id);
}
