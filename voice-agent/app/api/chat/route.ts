import { NextResponse } from "next/server";
import { runAgent, type ChatMessage } from "../../lib/agent";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { persona, messages } = (await req.json()) as {
      persona?: string;
      messages?: ChatMessage[];
    };
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Set ANTHROPIC_API_KEY in voice-agent/.env.local, then restart." },
        { status: 500 }
      );
    }
    const text = await runAgent(persona ?? "maya", messages ?? []);
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
