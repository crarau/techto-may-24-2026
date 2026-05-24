'use client';

import { ConversationProvider } from '@elevenlabs/react';
import { VoiceAgent } from './VoiceAgent';

export default function Home() {
  return (
    <ConversationProvider>
      <VoiceAgent />
    </ConversationProvider>
  );
}
