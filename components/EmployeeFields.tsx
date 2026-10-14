import { GRANTED_ROLE_LABEL } from "@/lib/labels";
import type { GrantedRole } from "@/lib/rules";

type Option = { id: string; name: string };
export type EmployeeFormValue = {
  name: string;
  email: string;
  position: string;
  departmentId: string | null;
  managerId: string | null;
  active: boolean;
  roles: GrantedRole[];
};

const input = "mt-1 w-full rounded border px-3 py-2";

export function EmployeeFields({ departments, managers, canGrantAdmin, value }: {
  departments: Option[];
  managers: Option[];
  canGrantAdmin: boolean;
  value?: EmployeeFormValue;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm">ชื่อ
        <input name="name" required maxLength={100} defaultValue={value?.name} className={input} />
      </label>
      <label className="block text-sm">อีเมล Google
        <input name="email" type="email" required defaultValue={value?.email} className={input} />
      </label>
      <label className="block text-sm">ตำแหน่ง
        <input name="position" maxLength={100} defaultValue={value?.position} className={input} />
      </label>
      <label className="block text-sm">แผนก
        <select name="departmentId" defaultValue={value?.departmentId ?? ""} className={input}>
          <option value="">ไม่ระบุ</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </label>
      <label className="block text-sm">หัวหน้า
        <select name="managerId" defaultValue={value?.managerId ?? ""} className={input}>
          <option value="">ไม่มี</option>
          {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
      <fieldset className="text-sm">
        <legend>สิทธิ์ที่ได้รับ</legend>
        <label className="mr-4 inline-flex items-center gap-1">
          <input type="checkbox" name="roles" value="HR" defaultChecked={value?.roles.includes("HR")} /> {GRANTED_ROLE_LABEL.HR}
        </label>
        {canGrantAdmin && (
          <label className="inline-flex items-center gap-1">
            <input type="checkbox" name="roles" value="ADMIN" defaultChecked={value?.roles.includes("ADMIN")} /> {GRANTED_ROLE_LABEL.ADMIN}
          </label>
        )}
      </fieldset>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={value?.active ?? true} /> ใช้งานอยู่
      </label>
    </div>
  );
}
