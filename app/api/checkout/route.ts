import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createOrder } from "../../../lib/orders-store";

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

    let preferenceId: string | null = null;
    let initPoint: string | null = null;

    const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const hasMercadoPagoToken = Boolean(
      mpToken && mpToken.trim() !== "" && mpToken !== "YOUR_MERCADO_PAGO_ACCESS_TOKEN"
    );
    const isProduction = process.env.NODE_ENV === "production";
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    const allowMock = !isProduction || isDemoMode;
    const hasSupabaseUrl = Boolean(process.env.SUPABASE_URL);
    const hasSupabaseServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

    if (hasMercadoPagoToken && mpToken) {
      try {
        console.log("Checkout configuration before Mercado Pago preference:", {
          hasMercadoPagoToken,
          mercadoPagoTokenLength: mpToken.length,
          appUrl,
          isProduction,
          isDemoMode,
          hasSupabaseUrl,
          hasSupabaseServiceRoleKey,
        });

        const mpClient = new MercadoPagoConfig({ accessToken: mpToken });
        const preference = new Preference(mpClient);
        const notificationUrl = `${appUrl}/api/mercadopago/webhook`;

        const response = await preference.create({
          body: {
            items: [
              {
                id: "blankats-premium",
                title: "Optimizacion de CV Profesional - BlankATS",
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
      } catch (mpError) {
        console.error("Failed to create real Mercado Pago preference:", safeErrorDetails(mpError));
        if (!allowMock) {
          return NextResponse.json({
            error: "checkout_mercadopago_preference_failed",
            details: safeErrorDetails(mpError),
          }, { status: 502 });
        }
      }
    } else if (!allowMock) {
      return NextResponse.json({
        error: "checkout_mercadopago_preference_failed",
        details: "Mercado Pago access token is not configured in production.",
      }, { status: 500 });
    }

    if (!initPoint) {
      if (!allowMock) {
        return NextResponse.json({
          error: "checkout_mercadopago_preference_failed",
          details: "Payment gateway init point was not returned in production.",
        }, { status: 500 });
      }
      console.log("Using Mock Checkout simulator.");
      initPoint = `${appUrl}/api/checkout/mock-pay?orderId=${orderId}`;
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
