import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { to: "/how-it-works", label: "How It Works" },
  { to: "/services", label: "Services" },
  { to: "/cpa-partners", label: "For CPAs" },
  { to: "/about", label: "About" },
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled || open ? "bg-background/85 backdrop-blur-md border-b border-border" : "bg-transparent"
      )}
    >
      <div className="container-prose flex items-center justify-between h-20">
        <Link to="/" className="flex items-baseline gap-2 group">
          <span className="font-display text-2xl font-semibold text-primary">Desired Labs</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  "text-sm font-medium transition-colors hover:text-accent",
                  isActive ? "text-accent" : "text-foreground/80"
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
          <Link to="/app/login" className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">
            Sign in →
          </Link>
          <Button asChild variant="brand" size="sm">
            <Link to="/contact">Get Started</Link>
          </Button>
        </nav>

        <button
          className="md:hidden p-2 text-foreground"
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="container-prose py-6 flex flex-col gap-4">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className="text-base font-medium py-2">
                {l.label}
              </NavLink>
            ))}
            <Link to="/app/login" className="text-base font-medium py-2 text-foreground/60 hover:text-foreground transition-colors">
              Sign in →
            </Link>
            <Button asChild variant="brand" className="mt-2">
              <Link to="/contact">Get Started</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
