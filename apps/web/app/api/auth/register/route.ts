import { NextResponse } from "next/server";
import { backendUrl } from "../../../../lib/backend";

export async function POST(req: Request) {
  const body = await req.json();
  const upstream = await fetch(backendUrl("/auth/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await upstream.json();
  return NextResponse.json(data, { status: upstream.status });
}
