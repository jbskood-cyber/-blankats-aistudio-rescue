import { redirect } from "next/navigation";

export default async function PaywallPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const resolvedParams = await searchParams;
  const orderId = resolvedParams.orderId || "";
  redirect(`/?status=paywall&orderId=${orderId}`);
}
