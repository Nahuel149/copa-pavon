import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { MainNavigation } from "@/app/components/MainNavigation";
import "./styles.css";

export const metadata: Metadata = {
  title: "Copa Kahl",
  description: "Formulario de pronosticos y panel de administracion para Copa Kahl, Prode Mundial 2026.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <div className="shell">
          <header className="masthead">
            <Link className="brand" href="/">
              <span className="brandMark">CK</span>
              <span>
                <strong>Copa Kahl</strong>
                <small>Prode Mundial 2026</small>
              </span>
            </Link>
            <MainNavigation />
            <div className="mastActions" aria-label="Acciones rapidas">
              <Link className="roundAction" href="/" aria-label="Abrir pronosticos">
                <Trophy size={20} aria-hidden="true" />
              </Link>
            </div>
          </header>
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
