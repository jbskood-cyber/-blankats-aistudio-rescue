export type CheckoutMode = "mock" | "sandbox" | "production";

export function getCheckoutMode(): CheckoutMode {
  const rawMode = (process.env.CHECKOUT_MODE || "").trim().toLowerCase();
  if (rawMode === "mock" || rawMode === "sandbox" || rawMode === "production") {
    return rawMode;
  }
  return "production";
}

export function isOfficialProductionUrl(appUrl: string | undefined | null) {
  return Boolean(appUrl && appUrl.includes("blankats-cv-mx.netlify.app"));
}
