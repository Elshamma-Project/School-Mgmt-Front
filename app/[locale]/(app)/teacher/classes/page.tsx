import { BookOpen } from "lucide-react";
import { ModulePage } from "@/components/workspace/module-page";

export const instant = false;

export default function TeacherClassesPage() {
  return <ModulePage ns="teacherClasses" icon={BookOpen} />;
}
