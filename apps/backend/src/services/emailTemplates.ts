import { SupportedLocale, normalizeLocale } from "../i18n/translations.js";
import { translateEmail } from "../i18n/index.js";
import { env } from "../config/env.js";

export function baseHtml(innerHtml: string, locale?: SupportedLocale | string | undefined): string {
  const lang = normalizeLocale(locale);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const logoUrl = `${env.PUBLIC_URL}/assets/icon.png`;
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Watchr</title>
  <style>
    /* Dark mode (default — brand colors) */
    .email-body { background-color: #1A1614 !important; }
    .email-card { background-color: #211C19 !important; }
    .email-heading { color: #F5F0EB !important; }
    .email-body-text { color: #C4BDB6 !important; }
    .email-footer { color: #8B8278 !important; }
    .email-cta { background-color: #C65D3A !important; color: #F5F0EB !important; }
    .email-copyright { color: #8B8278 !important; }
    .email-tip { background-color: #2A2420 !important; border-left: 3px solid #C65D3A !important; color: #C4BDB6 !important; }
    .email-link-secondary { color: #8B8278 !important; }

    /* Light mode override */
    @media (prefers-color-scheme: light) {
      .email-body { background-color: #F5F0EB !important; }
      .email-card { background-color: #FFFFFF !important; }
      .email-heading { color: #1A1614 !important; }
      .email-body-text { color: #4A4239 !important; }
      .email-footer { color: #8B8278 !important; }
      .email-cta { background-color: #C65D3A !important; color: #FFFFFF !important; }
      .email-copyright { color: #8B8278 !important; }
      .email-tip { background-color: #F5F0EB !important; border-left: 3px solid #C65D3A !important; color: #4A4239 !important; }
      .email-link-secondary { color: #8B8278 !important; }
    }

    /* Outlook safe-mode (always dark) */
    [data-ogsb] .email-body { background-color: #1A1614 !important; }
    [data-ogsb] .email-card { background-color: #211C19 !important; }
    [data-ogsb] .email-heading { color: #F5F0EB !important; }
    [data-ogsb] .email-body-text { color: #C4BDB6 !important; }
    [data-ogsb] .email-footer { color: #8B8278 !important; }
    [data-ogsb] .email-cta { background-color: #C65D3A !important; color: #F5F0EB !important; }
    [data-ogsb] .email-copyright { color: #8B8278 !important; }
    [data-ogsb] .email-tip { background-color: #2A2420 !important; border-left: 3px solid #C65D3A !important; color: #C4BDB6 !important; }
    [data-ogsb] .email-link-secondary { color: #8B8278 !important; }
  </style>
</head>
<body class="email-body" style="margin:0;padding:0;background-color:#1A1614;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-body" style="background-color:#1A1614;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <img src="${logoUrl}" alt="Watchr" width="48" height="48" style="display:block;margin:0 auto 24px auto;border-radius:8px;" />
        <table role="presentation" width="500" cellpadding="0" cellspacing="0" border="0" class="email-card" style="background-color:#211C19;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 40px;">
              ${innerHtml}
            </td>
          </tr>
        </table>
        <p class="email-copyright" style="color:#8B8278;font-size:0.8rem;margin-top:24px;text-align:center;">Watchr &copy; ${new Date().getFullYear()}</p>
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
  const tipUsername = translateEmail("welcomeTipUsername", locale, { username: params.username });
  const tipFeatures = translateEmail("welcomeTipFeatures", locale);
  const openApp = translateEmail("welcomeOpenApp", locale);
  const footer = translateEmail("welcomeFooter", locale);

  return {
    subject,
    html: baseHtml(`
      <h1 class="email-heading" style="color:#F5F0EB;font-size:1.5rem;margin:0 0 16px 0;font-weight:700;">${heading}</h1>
      <p class="email-body-text" style="color:#C4BDB6;font-size:1rem;line-height:1.6;margin:0 0 24px 0;">
        ${body}
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
        <tr>
          <td class="email-tip" style="background-color:#2A2420;border-left:3px solid #C65D3A;border-radius:0 8px 8px 0;padding:16px 20px;">
            <p class="email-body-text" style="color:#C4BDB6;font-size:0.9rem;line-height:1.6;margin:0 0 12px 0;">&#128161; ${tipUsername}</p>
            <p class="email-body-text" style="color:#C4BDB6;font-size:0.9rem;line-height:1.6;margin:0;">&#10024; ${tipFeatures}</p>
          </td>
        </tr>
      </table>
      <a href="https://app.watchr.me" class="email-cta" style="display:inline-block;background-color:#C65D3A;color:#F5F0EB;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:0.95rem;">
        ${cta}
      </a>
      <p style="margin:16px 0 0 0;">
        <a href="watchr://" class="email-link-secondary" style="color:#8B8278;font-size:0.85rem;text-decoration:underline;">${openApp}</a>
      </p>
      <p class="email-footer" style="color:#8B8278;font-size:0.8rem;margin:24px 0 0 0;line-height:1.5;">
        ${footer}
      </p>
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
  const tipSecurity = translateEmail("resetPasswordTipSecurity", locale);
  const webCta = translateEmail("resetPasswordWebCta", locale);
  const footer = translateEmail("resetPasswordFooter", locale);

  const webResetUrl = params.resetUrl.replace(/^watchr:\/\//, "https://app.watchr.me/");

  return {
    subject,
    html: baseHtml(`
      <h1 class="email-heading" style="color:#F5F0EB;font-size:1.5rem;margin:0 0 16px 0;font-weight:700;">${heading}</h1>
      <p class="email-body-text" style="color:#C4BDB6;font-size:1rem;line-height:1.6;margin:0 0 24px 0;">
        ${body}
      </p>
      <a href="${params.resetUrl}" class="email-cta" style="display:inline-block;background-color:#C65D3A;color:#F5F0EB;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:0.95rem;">
        ${cta}
      </a>
      <p style="margin:12px 0 0 0;">
        <a href="${webResetUrl}" class="email-link-secondary" style="color:#8B8278;font-size:0.85rem;text-decoration:underline;">${webCta}</a>
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0 0;">
        <tr>
          <td class="email-tip" style="background-color:#2A2420;border-left:3px solid #C65D3A;border-radius:0 8px 8px 0;padding:16px 20px;">
            <p class="email-body-text" style="color:#C4BDB6;font-size:0.9rem;line-height:1.6;margin:0;">&#128274; ${tipSecurity}</p>
          </td>
        </tr>
      </table>
      <p class="email-footer" style="color:#8B8278;font-size:0.85rem;margin:24px 0 0 0;line-height:1.5;">
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
  const tipAppeal = translateEmail("banTipAppeal", locale);

  let extraHtml = "";
  if (params.suspendedUntil) {
    const suspendedUntilText = translateEmail("banSuspendedUntil", locale, { date: params.suspendedUntil });
    extraHtml = `<p class="email-body-text" style="color:#C4BDB6;font-size:0.95rem;line-height:1.6;margin:16px 0 0 0;">${suspendedUntilText}</p>`;
  }

  return {
    subject,
    html: baseHtml(`
      <h1 class="email-heading" style="color:#F5F0EB;font-size:1.5rem;margin:0 0 16px 0;font-weight:700;">${heading}</h1>
      <p class="email-body-text" style="color:#C4BDB6;font-size:1rem;line-height:1.6;margin:0 0 24px 0;">
        ${body}
      </p>
      ${extraHtml}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0 0;">
        <tr>
          <td class="email-tip" style="background-color:#2A2420;border-left:3px solid #C65D3A;border-radius:0 8px 8px 0;padding:16px 20px;">
            <p class="email-body-text" style="color:#C4BDB6;font-size:0.9rem;line-height:1.6;margin:0;">&#9878;&#65039; ${tipAppeal}</p>
          </td>
        </tr>
      </table>
      <p class="email-footer" style="color:#8B8278;font-size:0.85rem;margin:24px 0 0 0;line-height:1.5;">
        ${footer}
      </p>
    `, locale),
  };
}

export function emailCodeTemplate(
  locale: SupportedLocale | string | undefined,
  params: { code: string; magicLinkUrl: string; webMagicLinkUrl: string },
): { subject: string; html: string } {
  const subject = translateEmail("emailCodeSubject", locale);
  const heading = translateEmail("emailCodeHeading", locale);
  const body = translateEmail("emailCodeBody", locale);
  const codeLabel = translateEmail("emailCodeLabel", locale);
  const cta = translateEmail("emailCodeCta", locale);
  const webCta = translateEmail("emailCodeWebCta", locale);
  const tipSecurity = translateEmail("emailCodeTipSecurity", locale);
  const footer = translateEmail("emailCodeFooter", locale);

  return {
    subject,
    html: baseHtml(`
      <h1 class="email-heading" style="color:#F5F0EB;font-size:1.5rem;margin:0 0 16px 0;font-weight:700;">${heading}</h1>
      <p class="email-body-text" style="color:#C4BDB6;font-size:1rem;line-height:1.6;margin:0 0 24px 0;">
        ${body}
      </p>
      <p class="email-body-text" style="color:#C4BDB6;font-size:0.9rem;line-height:1.6;margin:0 0 8px 0;">${codeLabel}</p>
      <p class="email-heading" style="color:#F5F0EB;font-size:2.5rem;font-weight:700;letter-spacing:0.5rem;margin:0 0 24px 0;text-align:center;">${params.code}</p>
      <a href="${params.magicLinkUrl}" class="email-cta" style="display:inline-block;background-color:#C65D3A;color:#F5F0EB;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:0.95rem;">
        ${cta}
      </a>
      <p style="margin:12px 0 0 0;">
        <a href="${params.webMagicLinkUrl}" class="email-link-secondary" style="color:#8B8278;font-size:0.85rem;text-decoration:underline;">${webCta}</a>
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0 0;">
        <tr>
          <td class="email-tip" style="background-color:#2A2420;border-left:3px solid #C65D3A;border-radius:0 8px 8px 0;padding:16px 20px;">
            <p class="email-body-text" style="color:#C4BDB6;font-size:0.9rem;line-height:1.6;margin:0;">&#128274; ${tipSecurity}</p>
          </td>
        </tr>
      </table>
      <p class="email-footer" style="color:#8B8278;font-size:0.85rem;margin:24px 0 0 0;line-height:1.5;">
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
  const tip = translateEmail("commentDeletedTip", locale);
  const footer = translateEmail("commentDeletedFooter", locale);

  return {
    subject,
    html: baseHtml(`
      <h1 class="email-heading" style="color:#F5F0EB;font-size:1.5rem;margin:0 0 16px 0;font-weight:700;">${heading}</h1>
      <p class="email-body-text" style="color:#C4BDB6;font-size:1rem;line-height:1.6;margin:0 0 24px 0;">
        ${body}
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
        <tr>
          <td class="email-tip" style="background-color:#2A2420;border-left:3px solid #C65D3A;border-radius:0 8px 8px 0;padding:16px 20px;">
            <p class="email-body-text" style="color:#C4BDB6;font-size:0.9rem;line-height:1.6;margin:0;">&#128161; ${tip}</p>
          </td>
        </tr>
      </table>
      <p class="email-footer" style="color:#8B8278;font-size:0.85rem;margin:24px 0 0 0;line-height:1.5;">
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
  const tip = translateEmail("commentHiddenTip", locale);
  const footer = translateEmail("commentHiddenFooter", locale);

  return {
    subject,
    html: baseHtml(`
      <h1 class="email-heading" style="color:#F5F0EB;font-size:1.5rem;margin:0 0 16px 0;font-weight:700;">${heading}</h1>
      <p class="email-body-text" style="color:#C4BDB6;font-size:1rem;line-height:1.6;margin:0 0 24px 0;">
        ${body}
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
        <tr>
          <td class="email-tip" style="background-color:#2A2420;border-left:3px solid #C65D3A;border-radius:0 8px 8px 0;padding:16px 20px;">
            <p class="email-body-text" style="color:#C4BDB6;font-size:0.9rem;line-height:1.6;margin:0;">&#128161; ${tip}</p>
          </td>
        </tr>
      </table>
      <p class="email-footer" style="color:#8B8278;font-size:0.85rem;margin:24px 0 0 0;line-height:1.5;">
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
  const tip = translateEmail("commentSpoilerTip", locale);
  const footer = translateEmail("commentSpoilerFooter", locale);

  return {
    subject,
    html: baseHtml(`
      <h1 class="email-heading" style="color:#F5F0EB;font-size:1.5rem;margin:0 0 16px 0;font-weight:700;">${heading}</h1>
      <p class="email-body-text" style="color:#C4BDB6;font-size:1rem;line-height:1.6;margin:0 0 24px 0;">
        ${body}
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
        <tr>
          <td class="email-tip" style="background-color:#2A2420;border-left:3px solid #C65D3A;border-radius:0 8px 8px 0;padding:16px 20px;">
            <p class="email-body-text" style="color:#C4BDB6;font-size:0.9rem;line-height:1.6;margin:0;">&#128161; ${tip}</p>
          </td>
        </tr>
      </table>
      <p class="email-footer" style="color:#8B8278;font-size:0.85rem;margin:24px 0 0 0;line-height:1.5;">
        ${footer}
      </p>
    `, locale),
  };
}
