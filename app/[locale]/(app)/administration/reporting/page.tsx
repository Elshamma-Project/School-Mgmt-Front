import { FileSpreadsheet } from "lucide-react";
import { ModulePage } from "@/components/workspace/module-page";

export const instant = false;

export default function AdminReportingPage() {
  return <ModulePage ns="adminReporting" icon={FileSpreadsheet} />;
}
