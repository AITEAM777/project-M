# Admin panel and email codes

## Admin panel — `admin.<your-domain>`

1. Sign up on the main site with the email you'll use as admin.
2. Vercel → Settings → Environment Variables → `ADMIN_EMAILS` = that email
   (several: comma-separated).
3. Vercel → Settings → Domains → add `admin.<your-domain>`; add the CNAME it shows
   at your DNS provider (Host `admin`).
4. Redeploy the **latest** deployment.
5. Open `https://admin.<your-domain>` → email + password → code from the email.

`/admin` on the main domain always answers 404. Every sign-in, failed attempt and
action is written to the audit log (Журнал дій).

## Email codes — resend.com

1. resend.com → Domains → add your domain → copy the DNS records it lists to your
   DNS provider and wait until they verify.
2. API Keys → create a key → Vercel env `RESEND_API_KEY`.
3. Optional: `MAIL_FROM` (default `Nodera <hello@noderamind.com>`).
4. Redeploy.

Without `RESEND_API_KEY`: sign-up works without a code, "Forgot password?" is
hidden, the admin panel asks for the password only (with a warning banner), and
emails listed in `ADMIN_EMAILS` can't be used to sign up.

## Daily job

`vercel.json` runs `/api/cron/daily` once a day: expires subscriptions whose paid
or granted period ended and clears old security rows. Set `CRON_SECRET` to require
Vercel's `Authorization: Bearer` header.
