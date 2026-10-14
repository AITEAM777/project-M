/** Throwaway-inbox domains that are refused at sign-up. Not exhaustive; covers the common ones. */
const DISPOSABLE = new Set([
  "10minutemail.com", "10minutemail.net", "20minutemail.com", "33mail.com", "anonaddy.me", "burnermail.io",
  "byom.de", "discard.email", "dispostable.com", "dropmail.me", "emailondeck.com", "fakeinbox.com", "fakemail.net",
  "getairmail.com", "getnada.com", "guerrillamail.biz", "guerrillamail.com", "guerrillamail.de", "guerrillamail.info",
  "guerrillamail.net", "guerrillamail.org", "guerrillamailblock.com", "harakirimail.com", "inboxbear.com",
  "inboxkitten.com", "incognitomail.org", "jetable.org", "mail-temp.com", "mail.tm", "mailcatch.com", "maildrop.cc",
  "mailinator.com", "mailinator.net", "mailnesia.com", "mailpoof.com", "mailsac.com", "mintemail.com", "moakt.com",
  "mohmal.com", "mytemp.email", "nada.email", "sharklasers.com", "spam4.me", "spambox.us", "spamgourmet.com",
  "temp-mail.io", "temp-mail.org", "tempail.com", "tempinbox.com", "tempmail.com", "tempmail.dev", "tempmail.net",
  "tempmail.plus", "tempmailo.com", "tempr.email", "throwawaymail.com", "trashmail.com", "trashmail.de",
  "trashmail.net", "yopmail.com", "yopmail.fr", "yopmail.net", "emailfake.com", "fakemailgenerator.com",
  "minuteinbox.com", "tmail.ws", "tmpmail.org", "tmpmail.net", "1secmail.com", "1secmail.net", "1secmail.org",
  "linshiyouxiang.net", "luxusmail.org", "mailto.plus", "fexpost.com", "fexbox.org", "rover.info", "chitthi.in",
  "emltmp.com", "spymail.one", "tempmailaddress.com", "vomoto.com", "wegwerfmail.de", "zetmail.com",
]);

export function isDisposableEmail(email: string) {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return false;
  // Also catch subdomains such as foo.mailinator.com.
  const parts = domain.split(".");
  for (let i = 0; i < parts.length - 1; i++) if (DISPOSABLE.has(parts.slice(i).join("."))) return true;
  return false;
}
