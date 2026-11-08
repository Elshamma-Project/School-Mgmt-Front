import { Users } from "lucide-react";
import { ModulePlaceholder } from "@/components/modules/module-placeholder";

export const instant = false;

export default function StaffPage() {
  return (
    <ModulePlaceholder
      namespace="staff"
      icon={Users}
      allowedRoles={["super_admin", "staff"]}
    />
  );
}
