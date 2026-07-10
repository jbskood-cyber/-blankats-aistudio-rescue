import { NextRequest, NextResponse } from "next/server";
import { getCheckoutMode } from "../../../../lib/checkout-mode";

export async function GET(req: NextRequest) {
  return NextResponse.json({
    checkoutMode: getCheckoutMode(req.headers.get("host")),
  });
}
