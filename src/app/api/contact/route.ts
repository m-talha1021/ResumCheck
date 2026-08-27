import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }
    if (name.length > 120 || email.length > 160 || subject.length > 200 || message.length > 3000) {
      return NextResponse.json({ error: "One or more fields are too long." }, { status: 400 });
    }

    console.log("Contact form received:", { name: name.slice(0, 120), subject: subject.slice(0, 200) });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not process your message." }, { status: 400 });
  }
}
