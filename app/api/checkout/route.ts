import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "../../../lib/orders-store";
import { getCheckoutMode, isMockCheckoutBlocked } from "../../../lib/checkout-mode";

function safeErrorDetails(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  const secrets = [
    process.env.MERCADO_PAGO_ACCESS_TOKEN,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_ANON_KEY,
  ].filter(Boolean) as string[];

  let message = raw;
  for (const secret of secrets) {
    message = message.split(secret).join("[redacted]");
  }

  return message
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/(access_token|token|apikey|api_key|service_role_key|authorization)=([^&\s]+)/gi, "$1=[redacted]")
    .slice(0, 300);
}

function getCheckoutOrigins(req: NextRequest) {
  const host = req.headers.get("host") || "localhost:3000";
  const rawProto = req.headers.get("x-forwarded-proto") || "https";
  const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
  const proto = isLocalhost ? rawProto : "https";
  const requestOrigin = `${proto}://${host}`;

  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  let appUrl = requestOrigin;

  if (configuredAppUrl?.startsWith("https://")) {
    try {
      const configuredHost = new URL(configuredAppUrl).host;
      appUrl = configuredHost === host ? configuredAppUrl.replace(/\/$/, "") : requestOrigin;
    } catch {
      appUrl = requestOrigin;
    }
  }

  return {
    appUrl: appUrl.replace(/\/$/, ""),
    requestOrigin: requestOrigin.replace(/\/$/, ""),
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
    const { appUrl, requestOrigin } = getCheckoutOrigins(req);

    const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const hasMercadoPagoToken = Boolean(
      mpToken && mpToken.trim() !== "" && mpToken !== "YOUR_MERCADO_PAGO_ACCESS_TOKEN"
    );
    const hasSupabaseUrl = Boolean(process.env.SUPABASE_URL);
    const hasSupabaseServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const checkoutMode = getCheckoutMode();

    console.log("Checkout configuration before Mercado Pago REST preference:", {
      appUrl,
      requestOrigin,
      checkoutMode,
      hasMercadoPagoToken,
      mercadoPagoTokenPrefix: mpToken ? mpToken.slice(0, 7) : null,
      mercadoPagoTokenLength: mpToken?.length || 0,
      hasSupabaseUrl,
      hasSupabaseServiceRoleKey,
    });

    let preferenceId: string | null = null;
    let initPoint: string | null = null;

    if (checkoutMode === "mock") {
      if (isMockCheckoutBlocked(appUrl, requestOrigin)) {
        return NextResponse.json({
          error: "checkout_mock_blocked",
          details: "Mock checkout is blocked on the production app URL.",
        }, { status: 403 });
      }

      try {
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
      } catch (orderError) {
        console.error("Failed to create mock checkout order:", safeErrorDetails(orderError));
        return NextResponse.json({
          error: "checkout_supabase_order_failed",
          details: safeErrorDetails(orderError),
        }, { status: 500 });
      }

      return NextResponse.json({
        orderId,
        init_point: `${appUrl}/success?orderId=${orderId}`,
        isMock: true,
      });
    }

    if (checkoutMode === "production" && mpToken?.startsWith("TEST-")) {
      return NextResponse.json({
        error: "checkout_mercadopago_preference_failed",
        details: "Production checkout mode requires a production Mercado Pago token.",
      }, { status: 500 });
    }

    if (hasMercadoPagoToken && mpToken) {
      try {
        const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${mpToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            items: [
              {
                id: "blankats-premium",
                title: "Optimizaci\u00f3n de CV Profesional - BlankATS",
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
            auto_return: "approved",
          }),
          cache: "no-store",
        });

        const mpData = await mpResponse.json().catch(() => null);

        if (!mpResponse.ok) {
          return NextResponse.json({
            error: "checkout_mercadopago_preference_failed",
            details: safeErrorDetails(
              mpData?.message || mpData?.error || mpData?.cause?.[0]?.description || JSON.stringify(mpData) || `${mpResponse.status} ${mpResponse.statusText}`
            ),
          }, { status: 502 });
        }

        preferenceId = mpData?.id || null;
        initPoint = checkoutMode === "sandbox" && mpToken.startsWith("TEST-")
          ? mpData?.sandbox_init_point || mpData?.init_point || null
          : mpData?.init_point || null;
      } catch (mpError) {
        console.error("Failed to create Mercado Pago REST preference:", safeErrorDetails(mpError));
        return NextResponse.json({
          error: "checkout_mercadopago_preference_failed",
          details: safeErrorDetails(mpError),
        }, { status: 502 });
      }
    } else {
      return NextResponse.json({
        error: "checkout_mercadopago_preference_failed",
        details: "Mercado Pago access token is not configured.",
      }, { status: 500 });
    }

    if (!preferenceId || !initPoint) {
      return NextResponse.json({
        error: "checkout_mercadopago_preference_failed",
        details: "Mercado Pago did not return a preference id or checkout init point.",
      }, { status: 502 });
    }

    try {
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
    } catch (orderError) {
      console.error("Failed to create Supabase checkout order:", safeErrorDetails(orderError));
      return NextResponse.json({
        error: "checkout_supabase_order_failed",
        details: safeErrorDetails(orderError),
      }, { status: 500 });
    }

    return NextResponse.json({
      orderId,
      init_point: initPoint,
      isMock: !preferenceId,
    });
  } catch (error) {
    console.error("Error in /api/checkout:", safeErrorDetails(error));
    return NextResponse.json({
      error: "checkout_unexpected_error",
      details: safeErrorDetails(error),
    }, { status: 500 });
  }
}
