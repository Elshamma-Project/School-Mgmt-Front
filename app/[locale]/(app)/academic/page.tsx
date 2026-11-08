import { BookOpen } from "lucide-react";
import { ModulePlaceholder } from "@/components/modules/module-placeholder";

export const instant = false;

export default function AcademicPage() {
  return (
    <ModulePlaceholder
      namespace="academic"
      icon={BookOpen}
      allowedRoles={["super_admin", "staff", "teacher", "guardian"]}
    />
  );
}
