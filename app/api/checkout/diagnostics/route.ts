import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase";

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

function getHost(value?: string) {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

// Debug-only endpoint. It returns sanitized checkout environment diagnostics
// without creating payments, orders, or exposing secrets.
export async function GET(req: NextRequest) {
  const appUrl = getAppUrl(req);
  const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL;
  const hasMercadoPagoToken = Boolean(
    mpToken && mpToken.trim() !== "" && mpToken !== "YOUR_MERCADO_PAGO_ACCESS_TOKEN"
  );
  const hasSupabaseUrl = Boolean(supabaseUrl);
  const hasSupabaseServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  const checks: {
    mercadoPagoAuth: {
      ok: boolean;
      status?: number;
      message?: string;
    };
    supabaseOrdersAccess: {
      ok: boolean;
      message?: string;
    };
  } = {
    mercadoPagoAuth: { ok: false },
    supabaseOrdersAccess: { ok: false },
  };

  if (!hasMercadoPagoToken || !mpToken) {
    checks.mercadoPagoAuth.message = "Mercado Pago access token is not configured.";
  } else {
    try {
      const response = await fetch("https://api.mercadopago.com/users/me", {
        headers: {
          Authorization: `Bearer ${mpToken}`,
        },
        cache: "no-store",
      });
      checks.mercadoPagoAuth.status = response.status;
      checks.mercadoPagoAuth.ok = response.ok;
      if (!response.ok) {
        const body = await response.text();
        checks.mercadoPagoAuth.message = safeErrorDetails(body || response.statusText);
      }
    } catch (error) {
      checks.mercadoPagoAuth.message = safeErrorDetails(error);
    }
  }

  if (!hasSupabaseUrl || !hasSupabaseServiceRoleKey) {
    checks.supabaseOrdersAccess.message = "Supabase URL or service role key is not configured.";
  } else {
    try {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        checks.supabaseOrdersAccess.message = "Supabase admin client could not be initialized.";
      } else {
        const { error } = await supabase
          .from("orders")
          .select("id")
          .limit(1);

        if (error) {
          checks.supabaseOrdersAccess.message = safeErrorDetails(error);
        } else {
          checks.supabaseOrdersAccess.ok = true;
        }
      }
    } catch (error) {
      checks.supabaseOrdersAccess.message = safeErrorDetails(error);
    }
  }

  const ok = checks.mercadoPagoAuth.ok && checks.supabaseOrdersAccess.ok;

  return NextResponse.json({
    ok,
    appUrl,
    nodeEnv: process.env.NODE_ENV,
    isDemoMode,
    hasMercadoPagoToken,
    mercadoPagoTokenLength: mpToken?.length || 0,
    hasSupabaseUrl,
    hasSupabaseServiceRoleKey,
    supabaseUrlHost: getHost(supabaseUrl),
    checks,
  });
}
