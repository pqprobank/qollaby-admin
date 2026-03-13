import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => ({}));
  console.log("[auth-debug]", JSON.stringify(payload));
  return NextResponse.json({ ok: true });
}
