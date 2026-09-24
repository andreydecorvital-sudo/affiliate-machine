import type { ReactNode } from "react";
import { OperatorShell } from "@/components/operator/shell";
import { getReadiness } from "@/lib/ui/operator-data";

export const dynamic = "force-dynamic";

export default function OperatorLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <OperatorShell readiness={getReadiness()}>
      {children}
    </OperatorShell>
  );
}
