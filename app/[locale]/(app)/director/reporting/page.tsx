import { Suspense } from "react";
import { ReportingHubView } from "@/components/reporting/reporting-hub-view";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const instant = false;

export default function DirectorReportingPage() {
  return (
    <Suspense
      fallback={
        <div className="px-1 py-2">
          <PageSkeleton variant="home" />
        </div>
      }
    >
      <ReportingHubView />
    </Suspense>
  );
}
