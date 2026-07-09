import { NextRequest, NextResponse } from "next/server";
import { getCheckoutMode, isOfficialProductionUrl } from "../../../lib/checkout-mode";
import { createOrder } from "../../../lib/orders-store";

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 300);
  return String(error).slice(0, 300);
}

function getAppUrl(req: NextRequest) {
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
  return appUrl;
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
    const appUrl = getAppUrl(req);
    const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const checkoutMode = getCheckoutMode();

    console.log("checkout_start", {
      checkoutMode,
      appUrl,
      hasMercadoPagoToken: Boolean(mpToken),
      mercadoPagoTokenPrefix: mpToken ? mpToken.slice(0, 7) : null,
      mercadoPagoTokenLength: mpToken?.length || 0,
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL),
      hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });

    if (checkoutMode === "mock") {
      if (isOfficialProductionUrl(appUrl)) {
        return NextResponse.json({ error: "checkout_mock_blocked_in_production" }, { status: 403 });
      }

      await createOrder({
        id: orderId,
        amount: 49.00,
        currency: "MXN",
        status: "pending",
        payment_provider: "mock",
        customer_email: customerEmail || null,
        mercado_pago_preference_id: null,
        analysis_json: analysis,
        improved_cv_json: improvedCV,
        original_file_name: fileName || null,
        download_token: downloadToken,
      });

      return NextResponse.json({
        orderId,
        init_point: `${appUrl}/api/checkout/mock-pay?orderId=${orderId}`,
        isMock: true,
      });
    }

    if (!mpToken || mpToken.trim() === "" || mpToken === "YOUR_MERCADO_PAGO_ACCESS_TOKEN") {
      return NextResponse.json(
        { error: "Error de configuración de pagos: Mercado Pago no está configurado." },
        { status: 500 }
      );
    }

    const isSecureUrl = appUrl.startsWith("https://") && !appUrl.includes("localhost") && !appUrl.includes("127.0.0.1");
    const preferenceData: Record<string, unknown> = {
      items: [
        {
          id: "blankats-premium",
          title: "Optimización de CV Profesional - BlankATS",
          description: "CV profesional optimizado en PDF y DOCX",
          quantity: 1,
          currency_id: "MXN",
          unit_price: 49,
        },
      ],
      external_reference: orderId,
      metadata: {
        order_id: orderId,
        product: "blankats_cv_premium",
      },
      back_urls: {
        success: `${appUrl}/success?orderId=${orderId}`,
        failure: `${appUrl}/paywall?orderId=${orderId}`,
        pending: `${appUrl}/pending?orderId=${orderId}`,
      },
      notification_url: `${appUrl}/api/mercadopago/webhook`,
    };

    if (isSecureUrl) {
      preferenceData.auto_return = "approved";
    }

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferenceData),
    });

    const mpData = await mpResponse.json().catch(() => ({}));
    if (!mpResponse.ok) {
      return NextResponse.json(
        {
          error: "checkout_mercadopago_preference_failed",
          details: safeErrorMessage(mpData?.message || mpData?.error || "Mercado Pago rechazó la preferencia."),
        },
        { status: 502 }
      );
    }

    const preferenceId = typeof mpData?.id === "string" ? mpData.id : null;
    const useSandboxPoint = checkoutMode === "sandbox" || mpToken.startsWith("TEST-");
    const initPoint = useSandboxPoint
      ? (mpData?.sandbox_init_point || mpData?.init_point || null)
      : (mpData?.init_point || null);

    if (!initPoint) {
      return NextResponse.json(
        { error: "checkout_mercadopago_preference_failed", details: "Mercado Pago no devolvió init_point." },
        { status: 502 }
      );
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
  } catch (error: unknown) {
    console.error("Error in /api/checkout:", error);
    return NextResponse.json({ error: safeErrorMessage(error) || "Internal Server Error" }, { status: 500 });
  }
}
