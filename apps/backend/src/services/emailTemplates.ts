import { SupportedLocale, DEFAULT_LOCALE } from "../i18n/translations.js";

function baseHtml(innerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Watchr</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="500" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px;">
              ${innerHtml}
            </td>
          </tr>
        </table>
        <p style="color:#666;font-size:0.8rem;margin-top:24px;">Watchr &copy; ${new Date().getFullYear()}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function welcomeTemplate(
  locale: SupportedLocale | string | undefined,
  params: { username: string },
): { subject: string; html: string } {
  const lang = locale === "fr" ? "fr" : DEFAULT_LOCALE;

  if (lang === "fr") {
    return {
      subject: "Bienvenue sur Watchr !",
      html: baseHtml(`
        <h1 style="color:#ffffff;font-size:1.5rem;margin:0 0 16px 0;">Bienvenue sur Watchr !</h1>
        <p style="color:#aaaaaa;font-size:1rem;line-height:1.6;margin:0 0 24px 0;">
          Bonjour ${params.username}, votre compte a été créé avec succès. Commencez à suivre vos séries et films préférés dès maintenant !
        </p>
        <a href="watchr://" style="display:inline-block;background:#6c5ce7;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:0.95rem;">
          Commencer
        </a>
      `),
    };
  }

  return {
    subject: "Welcome to Watchr!",
    html: baseHtml(`
      <h1 style="color:#ffffff;font-size:1.5rem;margin:0 0 16px 0;">Welcome to Watchr!</h1>
      <p style="color:#aaaaaa;font-size:1rem;line-height:1.6;margin:0 0 24px 0;">
        Hello ${params.username}, your account has been created successfully. Start tracking your favorite shows and movies now!
      </p>
      <a href="watchr://" style="display:inline-block;background:#6c5ce7;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:0.95rem;">
        Get started
      </a>
    `),
  };
}

export function resetPasswordTemplate(
  locale: SupportedLocale | string | undefined,
  params: { resetUrl: string },
): { subject: string; html: string } {
  const lang = locale === "fr" ? "fr" : DEFAULT_LOCALE;

  if (lang === "fr") {
    return {
      subject: "Réinitialisez votre mot de passe",
      html: baseHtml(`
        <h1 style="color:#ffffff;font-size:1.5rem;margin:0 0 16px 0;">Réinitialisez votre mot de passe</h1>
        <p style="color:#aaaaaa;font-size:1rem;line-height:1.6;margin:0 0 24px 0;">
          Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien expire dans 15 minutes.
        </p>
        <a href="${params.resetUrl}" style="display:inline-block;background:#6c5ce7;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:0.95rem;">
          Réinitialiser le mot de passe
        </a>
        <p style="color:#666;font-size:0.85rem;margin:24px 0 0 0;">
          Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
        </p>
      `),
    };
  }

  return {
    subject: "Reset your password",
    html: baseHtml(`
      <h1 style="color:#ffffff;font-size:1.5rem;margin:0 0 16px 0;">Reset your password</h1>
      <p style="color:#aaaaaa;font-size:1rem;line-height:1.6;margin:0 0 24px 0;">
        You requested a password reset. Click the button below to choose a new password. This link expires in 15 minutes.
      </p>
      <a href="${params.resetUrl}" style="display:inline-block;background:#6c5ce7;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:0.95rem;">
        Reset password
      </a>
      <p style="color:#666;font-size:0.85rem;margin:24px 0 0 0;">
        If you didn't request this reset, ignore this email.
      </p>
    `),
  };
}
