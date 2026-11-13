import { Suspense } from "react";
import { NotificationsView } from "@/components/notifications/notifications-view";

export const instant = false;

export default function NotificationsPage() {
  return (
    <Suspense fallback={null}>
      <NotificationsView />
    </Suspense>
  );
}
