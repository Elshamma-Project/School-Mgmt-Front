import { CalendarDays } from "lucide-react";
import { ModulePage } from "@/components/workspace/module-page";

export const instant = false;

export default function ParentTimetablePage() {
  return <ModulePage ns="parentTimetable" icon={CalendarDays} />;
}
