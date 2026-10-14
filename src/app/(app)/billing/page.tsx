import { redirect } from "next/navigation";

/** Plan & billing lives in Settings; keep /billing as a short link. */
export default function BillingPage() {
  redirect("/settings?tab=billing");
}
