import { UserRound } from "lucide-react";
import { ModulePage } from "@/components/workspace/module-page";

export const instant = false;

export default function DirectorAdminAccountsPage() {
  return <ModulePage ns="directorAdminAccounts" icon={UserRound} />;
}
