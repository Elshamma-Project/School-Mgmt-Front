import { Suspense } from "react";
import { TimetableHubView } from "@/components/timetable/timetable-hub-view";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const instant = false;

export default function AdminTimetablePage() {
  return (
    <Suspense
      fallback={
        <div className="px-1 py-2">
          <PageSkeleton variant="home" />
        </div>
      }
    >
      <TimetableHubView />
    </Suspense>
  );
}
