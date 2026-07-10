import { NextResponse } from "next/server";
import { getCheckoutMode } from "../../../../lib/checkout-mode";

export async function GET() {
  return NextResponse.json({
    checkoutMode: getCheckoutMode(),
  });
}
