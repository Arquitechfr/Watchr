import { Button } from "@react-email/components";

interface CtaButtonProps {
  href: string;
  children: string;
}

export function CtaButton({ href, children }: CtaButtonProps) {
  return (
    <Button
      href={href}
      className="email-cta"
      style={{
        display: "inline-block",
        backgroundColor: "#C65D3A",
        color: "#FFFFFF",
        textDecoration: "none",
        padding: "12px 32px",
        borderRadius: "8px",
        fontWeight: 600,
        fontSize: "0.95rem",
      }}
    >
      {children}
    </Button>
  );
}
