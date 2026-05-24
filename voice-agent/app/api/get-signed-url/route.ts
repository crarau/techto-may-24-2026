import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  const missing =
    !agentId || !apiKey || agentId.includes('REPLACE_ME') || apiKey.includes('REPLACE_ME');

  if (missing) {
    return NextResponse.json(
      {
        error:
          'Set ELEVENLABS_API_KEY and NEXT_PUBLIC_ELEVENLABS_AGENT_ID in voice-agent/.env.local, then restart the dev server.',
      },
      { status: 500 },
    );
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(agentId!)}`,
    { headers: { 'xi-api-key': apiKey! } },
  );

  if (!response.ok) {
    const body = await response.text();
    return NextResponse.json(
      { error: `ElevenLabs ${response.status}: ${body}` },
      { status: response.status },
    );
  }

  const data = (await response.json()) as { signed_url: string };
  return NextResponse.json({ signedUrl: data.signed_url });
}
