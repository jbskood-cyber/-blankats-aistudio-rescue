export type CheckoutMode = "mock" | "sandbox" | "production";

export function getCheckoutMode(): CheckoutMode {
  const rawMode = (process.env.CHECKOUT_MODE || "").trim().toLowerCase();
  if (rawMode === "mock" || rawMode === "sandbox" || rawMode === "production") {
    return rawMode;
  }
  
  // Fallback to "mock" if Mercado Pago is not configured
  const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const isMpConfigured = mpToken && mpToken.trim() !== "" && mpToken !== "YOUR_MERCADO_PAGO_ACCESS_TOKEN";
  if (!isMpConfigured) {
    return "mock";
  }

  return "production";
}

export function isOfficialProductionUrl(appUrl: string | undefined | null) {
  return Boolean(appUrl && appUrl.includes("blankats-cv-mx.netlify.app"));
}
