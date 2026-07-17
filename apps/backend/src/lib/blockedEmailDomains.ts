const BLOCKED_EMAIL_DOMAINS = new Set<string>([
  // Test / example / reserved
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "test.org",
  "invalid.com",
  "localhost",
  "localhost.com",
  "fake.com",
  "dummy.com",
  "placeholder.com",

  // Popular disposable email providers
  "mailinator.com",
  "mailinator.net",
  "mailinator.org",
  "10minutemail.com",
  "guerrillamail.com",
  "guerrillamailblock.com",
  "guerrillamail.info",
  "tempmail.com",
  "tempmail.net",
  "tempmail.org",
  "throwaway.email",
  "yopmail.com",
  "trashmail.com",
  "trashmail.me",
  "sharklasers.com",
  "grr.la",
  "dispostable.com",
  "fakeinbox.com",
  "maildrop.cc",
  "getnada.com",
  "mohmal.com",
  "mohmal.tech",
  "temp-mail.org",
  "tempr.email",
  "discard.email",
  "mailnesia.com",
  "tempinbox.com",
  "spam4.me",
  "trbvm.com",
  "edv.to",
  "slipry.net",
  "moakt.com",
  "incognitomail.com",
  "burnermail.io",
  "tmpmail.org",
  "tmpmail.net",
  "mailpoof.com",
  "smailpro.com",
  "tempmailo.com",
  "emailondeck.com",
  "spamgourmet.com",
  "harakirimail.com",
  "boximail.com",

  // Other disposable / temporary domains
  "mailcatch.com",
  "catchemail.com",
  "linshiyou.com",
  "tmails.net",
  "tmpjr.me",
  "shortmail.net",
  "emltmp.com",
  "fexpost.com",
  "dropmail.me",
  "inboxbear.com",
  "tafmail.com",
  "vomoto.com",
  "femailtor.com",
  "tmail.ws",
  "eyepaste.com",
  "pokemail.net",
  "spamcorptop.com",
  "safetymail.info",
  "safetypost.com",
  "txen.de",
  "warau.net",
  "drdrb.com",
  "frapmail.com",
  "obfusks.com",
  "rcpt.at",
  "mistermail.info",
  "one-time.email",
  "temporary-mail.net",
  "mytemp.email",
  "wefjo.com",
  "grn.cc",
  "alivance.com",
  "tmailinator.com",
]);

/**
 * Checks whether the domain of the given email address is in the blocked list.
 * The email is normalized (lowercased, trimmed) before extraction.
 */
export function isEmailDomainBlocked(email: string): boolean {
  const normalized = email.toLowerCase().trim();
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex === -1 || atIndex === normalized.length - 1) {
    return false;
  }
  const domain = normalized.slice(atIndex + 1);
  return BLOCKED_EMAIL_DOMAINS.has(domain);
}
