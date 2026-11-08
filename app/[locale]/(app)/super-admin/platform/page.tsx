import { Shield } from "lucide-react";
import { ModulePage } from "@/components/workspace/module-page";

export const instant = false;

export default function SuperAdminPlatformPage() {
  return <ModulePage ns="superPlatform" icon={Shield} />;
}
