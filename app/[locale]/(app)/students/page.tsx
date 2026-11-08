import { ModulePlaceholder } from "@/components/modules/module-placeholder";

export const instant = false;

export default function StudentsPage() {
  return (
    <ModulePlaceholder
      namespace="students"
      allowedRoles={["super_admin", "staff", "teacher", "guardian"]}
    />
  );
}
