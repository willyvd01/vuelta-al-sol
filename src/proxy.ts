import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Refresca la sesión de Supabase Auth en cada visita a /admin o /f, antes de
// que la vea cualquier Server Component. Sin esto, un token vencido a media
// visita dejaría al usuario con sesión "colgada" hasta la próxima recarga.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesParaGuardar) {
          for (const { name, value } of cookiesParaGuardar) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesParaGuardar) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/f/:path*"],
};
