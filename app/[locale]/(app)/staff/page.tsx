import { ModulePlaceholder } from "@/components/modules/module-placeholder";

export const instant = false;

export default function StaffPage() {
  return (
    <ModulePlaceholder namespace="staff" allowedRoles={["super_admin", "staff"]} />
  );
}
