import { Suspense } from "react";
import { GradesHubView } from "@/components/grades/grades-hub-view";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export const instant = false;

/** Hub SG : onglet fiches de report uniquement (visa SG). */
export default function SurveillantGeneralGradesPage() {
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
