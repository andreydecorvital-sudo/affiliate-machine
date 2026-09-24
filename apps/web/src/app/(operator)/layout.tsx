import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { OperatorShell } from "@/components/operator/shell";
import { hasOperatorSession } from "@/lib/single-user-auth";
import { getReadiness } from "@/lib/ui/operator-data";

export const dynamic = "force-dynamic";

export default async function OperatorLayout({
  children
}: {
  children: ReactNode;
}) {
  if (!(await hasOperatorSession())) {
    redirect("/login");
  }

  return (
    <OperatorShell readiness={getReadiness()}>
      {children}
    </OperatorShell>
  );
}
