import { Suspense } from "react";
import { StudentsHubView } from "@/components/students/students-hub-view";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const instant = false;

export default function AdminStudentsPage() {
  return (
    <Suspense
      fallback={
        <div className="px-1 py-2">
          <PageSkeleton variant="home" />
        </div>
      }
    >
      <StudentsHubView />
    </Suspense>
  );
}
