import { NextRequest, NextResponse } from "next/server";
import { getCheckoutMode, isMockCheckoutBlocked } from "../../../../lib/checkout-mode";

function getCheckoutOrigins(req: NextRequest) {
  const host = req.headers.get("host") || "localhost:3000";
  const rawProto = req.headers.get("x-forwarded-proto") || "https";
  const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
  const proto = isLocalhost ? rawProto : "https";
  const requestOrigin = `${proto}://${host}`.replace(/\/$/, "");
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

  return { appUrl, requestOrigin };
}

export async function GET(req: NextRequest) {
  const checkoutMode = getCheckoutMode();
  const { appUrl, requestOrigin } = getCheckoutOrigins(req);
  const mockBlocked = isMockCheckoutBlocked(appUrl, requestOrigin);

  return NextResponse.json({
    checkoutMode: mockBlocked ? "production" : checkoutMode,
    isMockEnabled: checkoutMode === "mock" && !mockBlocked,
  });
}
