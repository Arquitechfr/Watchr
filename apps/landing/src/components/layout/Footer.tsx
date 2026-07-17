import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Logo } from "@/components/shared/Logo";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const productLinks = [
    { href: "/#features", label: t("footer.links.features") },
    { href: "/#import", label: t("footer.links.import") },
    { href: "https://app.watchr.me", label: t("footer.links.webApp") },
  ];

  const companyLinks = [
    { to: "/about", label: t("footer.links.about") },
    { to: "/privacy", label: t("footer.links.privacy") },
    { to: "/terms", label: t("footer.links.terms") },
  ];

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-text-muted">
              {t("footer.tagline")}
            </p>
            <p className="mt-2 text-xs text-text-muted">
              {t("footer.madeWith")}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text">
              {t("footer.links.product")}
            </h3>
            <ul className="mt-4 space-y-3">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-text-muted transition-colors hover:text-primary"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text">
              {t("footer.links.company")}
            </h3>
            <ul className="mt-4 space-y-3">
              {companyLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-text-muted transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-text-muted">
            {t("footer.copyright", { year })}
          </p>
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  );
}
