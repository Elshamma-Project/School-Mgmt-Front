import { Suspense } from "react";
import { AcademicHubView } from "@/components/academic/academic-hub-view";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const instant = false;

export default function AdminAcademicPage() {
  return (
    <Suspense
      fallback={
        <div className="px-1 py-2">
          <PageSkeleton variant="home" />
        </div>
      }
    >
      <AcademicHubView />
    </Suspense>
  );
}
