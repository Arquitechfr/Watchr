import { Section, Container, Text } from "@react-email/components";
import type { ReactNode } from "react";

interface TipBoxProps {
  children: ReactNode;
  emoji?: string;
}

export function TipBox({ children, emoji }: TipBoxProps) {
  return (
    <Section style={{
      margin: "24px 0 0 0",
    }}>
      <Container className="email-tip" style={{
        backgroundColor: "#F0EAE3",
        borderLeft: "3px solid #C65D3A",
        borderRadius: "0 8px 8px 0",
        padding: "16px 20px",
      }}>
        <Text className="email-body-text" style={{
          color: "#4A4239",
          fontSize: "0.9rem",
          lineHeight: "1.6",
          margin: 0,
        }}>
          {emoji && `${emoji} `}
          {children}
        </Text>
      </Container>
    </Section>
  );
}
