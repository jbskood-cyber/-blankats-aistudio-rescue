import { redirect } from "next/navigation";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const resolvedParams = await searchParams;
  const orderId = resolvedParams.orderId || "";
  redirect(`/?status=success&orderId=${orderId}`);
}
