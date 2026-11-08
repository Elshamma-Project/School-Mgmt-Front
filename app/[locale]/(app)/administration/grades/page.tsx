import { Suspense } from "react";
import { GradesHubView } from "@/components/grades/grades-hub-view";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const instant = false;

export default function AdminGradesPage() {
  return (
    <Suspense
      fallback={
        <div className="px-1 py-2">
          <PageSkeleton variant="home" />
        </div>
      }
    >
      <GradesHubView modulePath="grades" />
    </Suspense>
  );
}
