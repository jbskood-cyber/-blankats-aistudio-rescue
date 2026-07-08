import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createOrder } from "../../../lib/orders-store";

const OFFICIAL_PRODUCTION_HOSTS = [
  "blankats-cv-mx.netlify.app",
  "production--blankats-cv-mx.netlify.app",
];

function isOfficialProductionValue(value?: string | null) {
  const normalized = value?.toLowerCase() || "";
  return OFFICIAL_PRODUCTION_HOSTS.some((host) => normalized.includes(host));
}

function resolveAppUrl(req: NextRequest) {
  const host = req.headers.get("host") || "localhost:3000";
  let protocol = req.headers.get("x-forwarded-proto") || "http";
  if (!host.includes("localhost") && !host.includes("127.0.0.1")) {
    protocol = "https";
  }

  let appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl || appUrl.trim() === "" || appUrl === "MY_APP_URL" || !appUrl.startsWith("http")) {
    appUrl = `${protocol}://${host}`;
  } else if (appUrl.startsWith("http://") && !appUrl.includes("localhost") && !appUrl.includes("127.0.0.1")) {
    appUrl = appUrl.replace("http://", "https://");
  }

  return {
    host,
    appUrl: appUrl.replace(/\/$/, ""),
    isOfficialProductionHost: isOfficialProductionValue(host) || isOfficialProductionValue(appUrl),
  };
}

export async function POST(req: NextRequest) {
  try {
    const { analysis, improvedCV, fileName, customerEmail } = await req.json();

    if (!analysis || !improvedCV) {
      return NextResponse.json(
        { error: "Missing analysis or improvedCV data." },
        { status: 400 }
      );
    }

    const orderId = crypto.randomUUID();
    const downloadToken = crypto.randomUUID();
    const { host, appUrl, isOfficialProductionHost } = resolveAppUrl(req);

    // MAIN / AI Studio rule:
    // Any non-official-production host uses mock checkout automatically.
    // This prevents Mercado Pago from opening in AI Studio while preserving
    // real payments if this code ever runs on the official production host.
    const shouldUseMockCheckout = !isOfficialProductionHost;

    console.log("Checkout mode resolved:", {
      checkoutMode: shouldUseMockCheckout ? "mock-main-dev" : "production-host",
      host,
      appUrl,
    });

    if (shouldUseMockCheckout) {
      const paidAt = new Date().toISOString();

      await createOrder({
        id: orderId,
        amount: 49.00,
        currency: "MXN",
        status: "approved",
        payment_provider: "mock",
        customer_email: customerEmail || null,
        mercado_pago_preference_id: null,
        mercado_pago_payment_id: `MOCK-PAY-${orderId.slice(0, 8).toUpperCase()}`,
        analysis_json: analysis,
        improved_cv_json: improvedCV,
        original_file_name: fileName || null,
        download_token: downloadToken,
        paid_at: paidAt,
      });

      return NextResponse.json({
        orderId,
        init_point: `${appUrl}/success?orderId=${orderId}`,
        isMock: true,
      });
    }

    let preferenceId: string | null = null;
    let initPoint: string | null = null;

    const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!mpToken || mpToken.trim() === "" || mpToken === "YOUR_MERCADO_PAGO_ACCESS_TOKEN") {
      return NextResponse.json({
        error: "Error de configuración de pagos: Mercado Pago no está configurado en producción."
      }, { status: 500 });
    }

    if (mpToken.startsWith("TEST-")) {
      return NextResponse.json({
        error: "Error de configuración de pagos: producción requiere un token productivo de Mercado Pago."
      }, { status: 500 });
    }

    try {
      console.log("Initializing real Mercado Pago preference for order:", orderId);
      const mpClient = new MercadoPagoConfig({ accessToken: mpToken });
      const preference = new Preference(mpClient);

      const notificationUrl = `${appUrl}/api/mercadopago/webhook`;

      const response = await preference.create({
        body: {
          items: [
            {
              id: "blankats-premium",
              title: "Optimización de CV Profesional - BlankATS",
              quantity: 1,
              unit_price: 49.00,
              currency_id: "MXN",
            },
          ],
          external_reference: orderId,
          back_urls: {
            success: `${appUrl}/success?orderId=${orderId}`,
            failure: `${appUrl}/paywall?orderId=${orderId}`,
            pending: `${appUrl}/pending?orderId=${orderId}`,
          },
          auto_return: "approved",
          notification_url: notificationUrl,
        },
      });

      preferenceId = response.id || null;
      initPoint = response.init_point || null;
    } catch (mpError: any) {
      console.error("Failed to create real Mercado Pago preference:", mpError);
      return NextResponse.json({
        error: "Error de configuración de pagos: No se pudo generar la preferencia de Mercado Pago en producción.",
        details: mpError.message || String(mpError)
      }, { status: 502 });
    }

    if (!initPoint) {
      return NextResponse.json({
        error: "Error de configuración de pagos: No se pudo generar la pasarela de pagos en producción."
      }, { status: 500 });
    }

    await createOrder({
      id: orderId,
      amount: 49.00,
      currency: "MXN",
      status: "pending",
      payment_provider: "mercadopago",
      customer_email: customerEmail || null,
      mercado_pago_preference_id: preferenceId,
      analysis_json: analysis,
      improved_cv_json: improvedCV,
      original_file_name: fileName || null,
      download_token: downloadToken,
    });

    return NextResponse.json({
      orderId,
      init_point: initPoint,
      isMock: false,
    });
  } catch (error: any) {
    console.error("Error in /api/checkout:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
