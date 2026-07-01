"use client";

import Link from "next/link";
import {
  Award,
  BarChart3,
  BookOpenCheck,
  Brackets,
  ChevronDown,
  LockKeyhole,
  Menu,
  Table2,
  X,
} from "lucide-react";
import { useState } from "react";

const primaryItems = [
  { href: "/tabla", label: "Tabla", icon: Table2 },
  { href: "/pronosticos", label: "Pronosticos", icon: BarChart3 },
  { href: "/eliminatorias", label: "Editar Prode", icon: Brackets },
];

const moreItems = [
  { href: "/reglas", label: "Reglas", icon: BookOpenCheck },
  { href: "/campeones", label: "Campeones", icon: Award },
  { href: "/admin", label: "Admin", icon: LockKeyhole },
];

const allItems = [...primaryItems, ...moreItems];

function NavLink({ href, label, icon: Icon, onClick }: (typeof allItems)[number] & { onClick?: () => void }) {
  return (
    <Link className="navItem" href={href} onClick={onClick}>
      <Icon size={17} aria-hidden="true" />
      <span className="navLabel"><strong>{label}</strong></span>
    </Link>
  );
}

export function MainNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="desktopNav" aria-label="Navegacion principal">
        {allItems.map((item) => <NavLink key={item.href} {...item} />)}
      </nav>

      <nav className={open ? "mobileNav open" : "mobileNav"} aria-label="Navegacion principal">
        <div className="mobileNavPrimary">
          {primaryItems.map((item) => <NavLink key={item.href} {...item} onClick={() => setOpen(false)} />)}
          <button
            className="navItem moreNavButton"
            onClick={() => setOpen((current) => !current)}
            type="button"
            aria-expanded={open}
            aria-label={open ? "Cerrar menu" : "Abrir menu"}
            title={open ? "Cerrar menu" : "Abrir menu"}
          >
            {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            <ChevronDown className="moreNavChevron" size={14} aria-hidden="true" />
          </button>
        </div>
        {open ? (
          <div className="mobileNavMore">
            {moreItems.map((item) => <NavLink key={item.href} {...item} onClick={() => setOpen(false)} />)}
          </div>
        ) : null}
      </nav>
    </>
  );
}
