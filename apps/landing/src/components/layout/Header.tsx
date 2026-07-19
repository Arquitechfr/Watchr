import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/shared/Logo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function Header() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { to: "/", hash: "top", label: t("nav.home") },
    { to: "/", hash: "features", label: t("nav.features") },
    { to: "/", hash: "import", label: t("nav.import") },
    { to: "/", hash: "showcase", label: t("nav.showcase") },
    { to: "/", hash: "faq", label: t("nav.faq") },
    { to: "/docs", hash: "top", label: t("nav.docs") },
  ];

  const handleNavClick = (e: React.MouseEvent, to: string, hash: string) => {
    e.preventDefault();
    setMobileOpen(false);
    if (window.location.pathname !== to) {
      navigate(to);
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: "smooth" });
        else window.scrollTo({ top: 0, behavior: "smooth" });
      }, 100);
    } else {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-40 transition-all duration-300",
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-md"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="Watchr">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.hash}
              href={link.to !== "/" ? link.to : `/#${link.hash}`}
              onClick={(e) => handleNavClick(e, link.to, link.hash)}
              className="text-sm font-medium text-text-muted transition-colors hover:text-text"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher className="hidden sm:block" />
          <ThemeToggle />
          <Button asChild size="sm" className="hidden md:inline-flex">
            <a href="https://app.watchr.me">{t("nav.getStarted")}</a>
          </Button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface md:hidden"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-b border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
            {navLinks.map((link) => (
              <a
                key={link.hash}
                href={link.to !== "/" ? link.to : `/#${link.hash}`}
                onClick={(e) => handleNavClick(e, link.to, link.hash)}
                className="rounded-lg px-4 py-3 text-sm font-medium text-text-muted transition-colors hover:bg-surface hover:text-text"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex items-center gap-2 px-4">
              <LanguageSwitcher />
            </div>
            <Button asChild className="mt-3">
              <a href="https://app.watchr.me">{t("nav.getStarted")}</a>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
