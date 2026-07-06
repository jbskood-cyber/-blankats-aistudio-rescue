import { redirect } from "next/navigation";

export default async function PendingPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const resolvedParams = await searchParams;
  const orderId = resolvedParams.orderId || "";
  redirect(`/?status=pending&orderId=${orderId}`);
}
