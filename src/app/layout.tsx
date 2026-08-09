import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { MainNavigation } from "@/app/components/MainNavigation";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import "./styles.css";

export const metadata: Metadata = {
  title: 'Copa "Se mató Pavón"',
  description: "Formulario de pronósticos y panel de administración para Copa Se mató Pavón, Prode Copas Estelares 2026.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("copa-kahl-theme");if(t!=="dark"&&t!=="light"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){}`,
          }}
        />
      </head>
      <body>
        <div className="shell">
          <header className="masthead">
            <Link className="brand" href="/tabla">
              <span className="brandMark">SMP</span>
              <span>
                <strong>Copa &quot;Se mató Pavón&quot;</strong>
                <small>Prode Copas Estelares 2026</small>
              </span>
            </Link>
            <MainNavigation />
            <div className="mastActions" aria-label="Acciones rapidas">
              <ThemeToggle />
              <Link className="roundAction tableShortcut" href="/tabla" aria-label="Abrir tabla">
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
