'use client';

import { PublicSessionsShowcase } from '@/components/chat/PublicSessionsShowcase';

export default function TestShowcasePage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-8">Test Public Sessions Showcase</h1>
      <PublicSessionsShowcase 
        onSessionClick={(sessionId) => {
          console.log('Session clicked:', sessionId);
          alert(`Session clicked: ${sessionId}`);
        }}
      />
    </div>
  );
} 