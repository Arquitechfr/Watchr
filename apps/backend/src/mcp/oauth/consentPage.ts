import { env } from "../../config/env.js";

const STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #1A1614;
    color: #F5F0EB;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
  .container {
    max-width: 420px;
    width: 100%;
    background: #221E1B;
    border-radius: 16px;
    padding: 2rem;
    border: 1px solid #2E2A27;
  }
  .logo {
    text-align: center;
    margin-bottom: 1.5rem;
  }
  .logo img {
    height: 40px;
    width: 40px;
    border-radius: 8px;
  }
  .subtitle {
    text-align: center;
    color: #8B8580;
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
  }
  .form-group {
    margin-bottom: 1rem;
  }
  label {
    display: block;
    font-size: 0.875rem;
    color: #8B8580;
    margin-bottom: 0.5rem;
  }
  input[type="email"], input[type="password"] {
    width: 100%;
    padding: 0.75rem 1rem;
    background: #1A1614;
    border: 1px solid #3A3633;
    border-radius: 8px;
    color: #F5F0EB;
    font-size: 0.9375rem;
    outline: none;
    transition: border-color 0.2s;
  }
  input[type="email"]:focus, input[type="password"]:focus {
    border-color: #C65D3A;
  }
  .btn {
    width: 100%;
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 8px;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  .btn:hover { opacity: 0.9; }
  .btn-primary {
    background: #C65D3A;
    color: #FFFFFF;
  }
  .btn-google {
    background: #FFFFFF;
    color: #1A1614;
    margin-top: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  .btn-secondary {
    background: transparent;
    color: #8B8580;
    border: 1px solid #3A3633;
    margin-top: 0.75rem;
  }
  .divider {
    text-align: center;
    color: #5A5550;
    font-size: 0.8125rem;
    margin: 1rem 0;
  }
  .error {
    background: rgba(220, 38, 38, 0.15);
    border: 1px solid rgba(220, 38, 38, 0.3);
    color: #FCA5A5;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-size: 0.8125rem;
    margin-bottom: 1rem;
  }
  .consent-info {
    background: #1A1614;
    border-radius: 12px;
    padding: 1rem;
    margin: 1rem 0;
  }
  .consent-info .app-name {
    font-size: 1.125rem;
    font-weight: 600;
    color: #F5F0EB;
  }
  .consent-info .app-url {
    font-size: 0.8125rem;
    color: #8B8580;
    margin-top: 0.25rem;
  }
  .scope-list {
    margin: 1rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .scope-checkbox {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    padding: 0.75rem;
    background: #1A1614;
    border: 1px solid #3A3633;
    border-radius: 8px;
    cursor: pointer;
  }
  .scope-checkbox input[type="checkbox"] {
    margin-top: 0.15rem;
    accent-color: #C65D3A;
  }
  .scope-checkbox .scope-text {
    display: flex;
    flex-direction: column;
  }
  .scope-checkbox .scope-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #F5F0EB;
  }
  .scope-checkbox .scope-description {
    font-size: 0.75rem;
    color: #8B8580;
  }
  .hidden { display: none; }
`;

function baseHtml(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Watchr</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="logo"><img src="${env.PUBLIC_URL}/assets/icon.png" alt="Watchr"></div>
    ${bodyContent}
  </div>
</body>
</html>`;
}

export function renderLoginPage(
  consentParams: string,
  error?: string,
): string {
  const errorHtml = error ? `<div class="error">${escapeHtml(error)}</div>` : "";
  return baseHtml("Authorize", `
    <p class="subtitle">Sign in to your Watchr account to authorize this app</p>
    ${errorHtml}
    <form method="POST" action="/mcp/auth/consent/login">
      <input type="hidden" name="consent_params" value="${escapeHtml(consentParams)}">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required autocomplete="email" autofocus>
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required autocomplete="current-password">
      </div>
      <button type="submit" class="btn btn-primary">Sign In</button>
    </form>
    <div class="divider">or</div>
    <a href="/mcp/auth/google/init?consent_params=${encodeURIComponent(consentParams)}" class="btn btn-google">
      <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
      Continue with Google
    </a>
  `);
}

const AVAILABLE_SCOPES: { value: string; label: string; description: string }[] = [
  { value: "read", label: "Read", description: "View your watchlist, ratings, and comments" },
  { value: "write", label: "Write", description: "Add or update your watchlist, ratings, and comments" },
];

export function renderConsentPage(
  clientName: string,
  clientUri: string | undefined,
  requestedScopes: string[],
  consentParams: string,
): string {
  const scopeCheckboxes = AVAILABLE_SCOPES.map((s) => {
    const checked = requestedScopes.includes(s.value) ? "checked" : "";
    return `
      <label class="scope-checkbox">
        <input type="checkbox" name="scopes" value="${s.value}" ${checked}>
        <span class="scope-text">
          <span class="scope-label">${escapeHtml(s.label)}</span>
          <span class="scope-description">${escapeHtml(s.description)}</span>
        </span>
      </label>`;
  }).join("");

  return baseHtml("Authorize", `
    <p class="subtitle">An app is requesting access to your Watchr account</p>
    <div class="consent-info">
      <div class="app-name">${escapeHtml(clientName)}</div>
      ${clientUri ? `<div class="app-url">${escapeHtml(clientUri)}</div>` : ""}
    </div>
    <p class="subtitle">Choose the permissions to grant:</p>
    <form method="POST" action="/mcp/auth/consent/approve">
      <input type="hidden" name="consent_params" value="${escapeHtml(consentParams)}">
      <div class="scope-list">${scopeCheckboxes}</div>
      <button type="submit" class="btn btn-primary">Authorize</button>
    </form>
    <form method="POST" action="/mcp/auth/consent/deny">
      <input type="hidden" name="consent_params" value="${escapeHtml(consentParams)}">
      <button type="submit" class="btn btn-secondary">Deny</button>
    </form>
  `);
}

export function renderErrorPage(message: string): string {
  return baseHtml("Error", `
    <p class="subtitle" style="color: #FCA5A5;">${escapeHtml(message)}</p>
    <p class="subtitle">You can close this window and try again.</p>
  `);
}

export function renderSuccessPage(): string {
  return baseHtml("Authorized", `
    <p class="subtitle" style="color: #4ADE80;">Authorization successful!</p>
    <p class="subtitle">You can close this window and return to your app.</p>
  `);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
