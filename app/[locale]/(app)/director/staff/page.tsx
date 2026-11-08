import { Suspense } from "react";
import { StaffListView } from "@/components/staff/staff-list-view";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const instant = false;

export default function DirectorStaffPage() {
  return (
    <Suspense
      fallback={
        <div className="px-1 py-2">
          <PageSkeleton variant="home" />
        </div>
      }
    >
      <StaffListView descriptionKey="directorStaff" />
    </Suspense>
  );
}
