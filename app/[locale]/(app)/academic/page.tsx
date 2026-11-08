import { ModulePlaceholder } from "@/components/modules/module-placeholder";

export const instant = false;

export default function AcademicPage() {
  return (
    <ModulePlaceholder
      namespace="academic"
      allowedRoles={["super_admin", "staff", "teacher", "guardian"]}
    />
  );
}
