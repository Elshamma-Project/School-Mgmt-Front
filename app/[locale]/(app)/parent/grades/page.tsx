import { ClipboardList } from "lucide-react";
import { ModulePage } from "@/components/workspace/module-page";

export const instant = false;

export default function ParentGradesPage() {
  return <ModulePage ns="parentGrades" icon={ClipboardList} />;
}
