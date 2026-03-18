
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function GET() {
  try {
    const subs = await stripe.subscriptions.list({ limit: 10 });
    return NextResponse.json({ 
      subscriptions: subs.data.map(s => ({ 
        id: s.id, 
        status: s.status, 
        created: new Date(s.created * 1000).toISOString() 
      })) 
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
