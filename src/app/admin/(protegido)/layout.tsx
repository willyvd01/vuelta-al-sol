import type { ReactNode } from "react";
import { requerirSesion } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function ProtegidoLayout({ children }: { children: ReactNode }) {
  await requerirSesion();
  return children;
}
