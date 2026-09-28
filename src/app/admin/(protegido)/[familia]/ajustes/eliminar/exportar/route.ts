import { NextResponse } from "next/server";

import { requerirMiembro } from "@/lib/admin";
import { construirExportacionFamilia } from "@/lib/supabase-admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ familia: string }> }
) {
  const { familia: slug } = await params;
  const { familia, esAdmin } = await requerirMiembro(slug);
  if (!esAdmin) {
    return NextResponse.json({ error: "Solo un administrador puede exportar." }, { status: 403 });
  }

  const zip = await construirExportacionFamilia(familia.id, familia.nombre);

  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${familia.slug}-exportacion.zip"`,
    },
  });
}
