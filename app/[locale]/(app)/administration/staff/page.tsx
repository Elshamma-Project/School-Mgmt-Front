import { Users } from "lucide-react";
import { ModulePage } from "@/components/workspace/module-page";

export const instant = false;

export default function AdminStaffPage() {
  return <ModulePage ns="adminStaff" icon={Users} />;
}
