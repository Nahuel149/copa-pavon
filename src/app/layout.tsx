import type { Metadata } from "next";
import Link from "next/link";
import { Award, BarChart3, BookOpenCheck, Brackets, ClipboardList, LockKeyhole, PencilLine, Table2, Trophy } from "lucide-react";
import "./styles.css";

export const metadata: Metadata = {
  title: "Copa Kahl",
  description: "Formulario de pronósticos y panel de administración para Copa Kahl, Prode Mundial 2026.",
};

const navItems = [
  { href: "/", label: "Cargar", icon: ClipboardList },
  { href: "/pronosticos", label: "Pronosticos", icon: BarChart3 },
  { href: "/editar", label: "Editar", icon: PencilLine },
  { href: "/eliminatorias", label: "Eliminatorias", icon: Brackets },
  { href: "/reglas", label: "Reglas", icon: BookOpenCheck },
  { href: "/campeones", label: "Campeones", icon: Award },
  { href: "/tabla", label: "Tabla", icon: Table2 },
  { href: "/admin", label: "Admin", icon: LockKeyhole },
];

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
            <nav aria-label="Navegación principal">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} className="navItem" href={item.href}>
                    <Icon size={17} aria-hidden="true" />
                    <span className="navLabel">
                      <strong>{item.label}</strong>
                    </span>
                  </Link>
                );
              })}
            </nav>
            <div className="mastActions" aria-label="Acciones rápidas">
              <Link className="roundAction" href="/" aria-label="Abrir pronósticos">
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
