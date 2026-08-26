import { redirect } from "next/navigation";

/**
 * Legacy short link. Any QR code already printed on a ward points here, so it
 * must keep working forever — a redirect is cheaper than a reprint.
 */
export default async function LegacyRespondRedirect({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(`/respond/${token}`);
}
