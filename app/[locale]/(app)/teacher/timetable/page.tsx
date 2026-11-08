import { CalendarDays } from "lucide-react";
import { ModulePage } from "@/components/workspace/module-page";

export const instant = false;

export default function TeacherTimetablePage() {
  return <ModulePage ns="teacherTimetable" icon={CalendarDays} />;
}
