export type CheckoutMode = "mock" | "sandbox" | "production";

const allowedCheckoutModes: CheckoutMode[] = ["mock", "sandbox", "production"];
const productionHost = "blankats-cv-mx.netlify.app";

export function getCheckoutMode(): CheckoutMode {
  const value = process.env.CHECKOUT_MODE?.trim().toLowerCase();
  if (allowedCheckoutModes.includes(value as CheckoutMode)) {
    return value as CheckoutMode;
  }
  return "production";
}

export function isOfficialProductionUrl(value?: string | null) {
  return Boolean(value?.toLowerCase().includes(productionHost));
}

export function isMockCheckoutBlocked(appUrl: string, requestOrigin: string) {
  return (
    getCheckoutMode() === "mock" &&
    (
      isOfficialProductionUrl(process.env.NEXT_PUBLIC_APP_URL) ||
      isOfficialProductionUrl(appUrl) ||
      isOfficialProductionUrl(requestOrigin)
    )
  );
}
