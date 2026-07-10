import { SupportedLocale, normalizeLocale } from "../i18n/translations.js";
import { translateEmail } from "../i18n/index.js";
import { env } from "../config/env.js";

export function baseHtml(innerHtml: string, locale?: SupportedLocale | string | undefined): string {
  const lang = normalizeLocale(locale);
  const logoUrl = `${env.PUBLIC_URL}/assets/icon.png`;
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Watchr</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <img src="${logoUrl}" alt="Watchr" width="48" height="48" style="display:block;margin:0 auto 24px auto;border-radius:8px;" />
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
  const subject = translateEmail("welcomeSubject", locale);
  const heading = translateEmail("welcomeHeading", locale);
  const body = translateEmail("welcomeBody", locale, { username: params.username });
  const cta = translateEmail("welcomeCta", locale);

  return {
    subject,
    html: baseHtml(`
      <h1 style="color:#ffffff;font-size:1.5rem;margin:0 0 16px 0;">${heading}</h1>
      <p style="color:#aaaaaa;font-size:1rem;line-height:1.6;margin:0 0 24px 0;">
        ${body}
      </p>
      <a href="watchr://" style="display:inline-block;background:#6c5ce7;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:0.95rem;">
        ${cta}
      </a>
    `, locale),
  };
}

export function resetPasswordTemplate(
  locale: SupportedLocale | string | undefined,
  params: { resetUrl: string },
): { subject: string; html: string } {
  const subject = translateEmail("resetPasswordSubject", locale);
  const heading = translateEmail("resetPasswordHeading", locale);
  const body = translateEmail("resetPasswordBody", locale);
  const cta = translateEmail("resetPasswordCta", locale);
  const footer = translateEmail("resetPasswordFooter", locale);

  return {
    subject,
    html: baseHtml(`
      <h1 style="color:#ffffff;font-size:1.5rem;margin:0 0 16px 0;">${heading}</h1>
      <p style="color:#aaaaaa;font-size:1rem;line-height:1.6;margin:0 0 24px 0;">
        ${body}
      </p>
      <a href="${params.resetUrl}" style="display:inline-block;background:#6c5ce7;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:0.95rem;">
        ${cta}
      </a>
      <p style="color:#666;font-size:0.85rem;margin:24px 0 0 0;">
        ${footer}
      </p>
    `, locale),
  };
}

export function banNotificationTemplate(
  locale: SupportedLocale | string | undefined,
  params: {
    username: string;
    action: string;
    reason: string;
    effectiveDate: string;
    suspendedUntil?: string;
  },
): { subject: string; html: string } {
  const subject = translateEmail("banSubject", locale, { username: params.username });
  const heading = translateEmail("banHeading", locale);
  const body = translateEmail("banBody", locale, {
    username: params.username,
    action: params.action,
    reason: params.reason,
    effectiveDate: params.effectiveDate,
  });
  const footer = translateEmail("banFooter", locale);

  let extraHtml = "";
  if (params.suspendedUntil) {
    const suspendedUntilText = translateEmail("banSuspendedUntil", locale, { date: params.suspendedUntil });
    extraHtml = `<p style="color:#aaaaaa;font-size:0.95rem;line-height:1.6;margin:16px 0 0 0;">${suspendedUntilText}</p>`;
  }

  return {
    subject,
    html: baseHtml(`
      <h1 style="color:#ffffff;font-size:1.5rem;margin:0 0 16px 0;">${heading}</h1>
      <p style="color:#aaaaaa;font-size:1rem;line-height:1.6;margin:0 0 24px 0;">
        ${body}
      </p>
      ${extraHtml}
      <p style="color:#666;font-size:0.85rem;margin:24px 0 0 0;">
        ${footer}
      </p>
    `, locale),
  };
}

export function commentDeletedTemplate(
  locale: SupportedLocale | string | undefined,
  params: { username: string; showTitle: string },
): { subject: string; html: string } {
  const subject = translateEmail("commentDeletedSubject", locale);
  const heading = translateEmail("commentDeletedHeading", locale);
  const body = translateEmail("commentDeletedBody", locale, {
    username: params.username,
    show: params.showTitle,
  });
  const footer = translateEmail("commentDeletedFooter", locale);

  return {
    subject,
    html: baseHtml(`
      <h1 style="color:#ffffff;font-size:1.5rem;margin:0 0 16px 0;">${heading}</h1>
      <p style="color:#aaaaaa;font-size:1rem;line-height:1.6;margin:0 0 24px 0;">
        ${body}
      </p>
      <p style="color:#666;font-size:0.85rem;margin:24px 0 0 0;">
        ${footer}
      </p>
    `, locale),
  };
}

export function commentHiddenTemplate(
  locale: SupportedLocale | string | undefined,
  params: { username: string; showTitle: string },
): { subject: string; html: string } {
  const subject = translateEmail("commentHiddenSubject", locale);
  const heading = translateEmail("commentHiddenHeading", locale);
  const body = translateEmail("commentHiddenBody", locale, {
    username: params.username,
    show: params.showTitle,
  });
  const footer = translateEmail("commentHiddenFooter", locale);

  return {
    subject,
    html: baseHtml(`
      <h1 style="color:#ffffff;font-size:1.5rem;margin:0 0 16px 0;">${heading}</h1>
      <p style="color:#aaaaaa;font-size:1rem;line-height:1.6;margin:0 0 24px 0;">
        ${body}
      </p>
      <p style="color:#666;font-size:0.85rem;margin:24px 0 0 0;">
        ${footer}
      </p>
    `, locale),
  };
}

export function commentSpoilerTemplate(
  locale: SupportedLocale | string | undefined,
  params: { username: string; showTitle: string },
): { subject: string; html: string } {
  const subject = translateEmail("commentSpoilerSubject", locale);
  const heading = translateEmail("commentSpoilerHeading", locale);
  const body = translateEmail("commentSpoilerBody", locale, {
    username: params.username,
    show: params.showTitle,
  });
  const footer = translateEmail("commentSpoilerFooter", locale);

  return {
    subject,
    html: baseHtml(`
      <h1 style="color:#ffffff;font-size:1.5rem;margin:0 0 16px 0;">${heading}</h1>
      <p style="color:#aaaaaa;font-size:1rem;line-height:1.6;margin:0 0 24px 0;">
        ${body}
      </p>
      <p style="color:#666;font-size:0.85rem;margin:24px 0 0 0;">
        ${footer}
      </p>
    `, locale),
  };
}
