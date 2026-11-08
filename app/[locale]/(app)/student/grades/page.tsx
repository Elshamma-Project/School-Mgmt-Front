import { ClipboardList } from "lucide-react";
import { ModulePage } from "@/components/workspace/module-page";

export const instant = false;

export default function StudentGradesPage() {
  return <ModulePage ns="studentGrades" icon={ClipboardList} />;
}
