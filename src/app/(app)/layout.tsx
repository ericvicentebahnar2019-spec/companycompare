import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui";
import { logoutAction } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { isEphemeralStore } from "@/lib/db";

const PLAN_LABEL: Record<string, string> = {
  FREE: "Free",
  PRO: "Pro",
  BUSINESS: "Business",
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AppShell
      userName={user.name}
      plan={PLAN_LABEL[user.plan] ?? user.plan}
      ephemeral={isEphemeralStore()}
      logout={
        <form action={logoutAction}>
          <Button type="submit" variant="secondary" className="w-full">
            Cerrar sesión
          </Button>
        </form>
      }
    >
      {children}
    </AppShell>
  );
}
