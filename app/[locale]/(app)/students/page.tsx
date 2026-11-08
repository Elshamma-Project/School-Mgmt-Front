import { GraduationCap } from "lucide-react";
import { ModulePlaceholder } from "@/components/modules/module-placeholder";

export const instant = false;

export default function StudentsPage() {
  return (
    <ModulePlaceholder
      namespace="students"
      icon={GraduationCap}
      allowedRoles={["super_admin", "staff", "teacher", "guardian"]}
    />
  );
}
