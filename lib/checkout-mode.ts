export type CheckoutMode = "mock" | "sandbox" | "production";

const OFFICIAL_PRODUCTION_HOST = "blankats-cv-mx.netlify.app";

export function isOfficialProductionUrl(value: string | undefined | null) {
  return Boolean(value && value.toLowerCase().includes(OFFICIAL_PRODUCTION_HOST));
}

export function getCheckoutMode(requestHostOrUrl?: string | null): CheckoutMode {
  // Safety rule for main / AI Studio / localhost / previews:
  // Mercado Pago real is allowed ONLY on the official production host.
  if (!isOfficialProductionUrl(requestHostOrUrl)) {
    return "mock";
  }

  const rawMode = (process.env.CHECKOUT_MODE || "").trim().toLowerCase();
  if (rawMode === "mock" || rawMode === "sandbox" || rawMode === "production") {
    return rawMode;
  }

  const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const isMpConfigured = mpToken && mpToken.trim() !== "" && mpToken !== "YOUR_MERCADO_PAGO_ACCESS_TOKEN";
  if (!isMpConfigured) {
    return "mock";
  }

  return "production";
}
