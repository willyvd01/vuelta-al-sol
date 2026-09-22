import type { Metadata } from "next";
import type { ReactNode } from "react";

// Las páginas del álbum son privadas por dirección: nunca deben indexarse.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AlbumLayout({ children }: { children: ReactNode }) {
  return children;
}
