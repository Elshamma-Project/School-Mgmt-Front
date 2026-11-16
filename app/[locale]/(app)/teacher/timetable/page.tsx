import { Suspense } from "react";
import { TeacherTimetableView } from "@/components/teacher/teacher-timetable-view";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const instant = false;

export default function TeacherTimetablePage() {
  return (
    <Suspense
      fallback={
        <div className="px-1 py-2">
          <PageSkeleton variant="home" />
        </div>
      }
    >
      <TeacherTimetableView />
    </Suspense>
  );
}
