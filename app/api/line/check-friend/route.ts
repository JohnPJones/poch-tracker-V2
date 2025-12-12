import { NextRequest, NextResponse } from 'next/server';

const LINE_MESSAGING_TOKEN = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    const res = await fetch(`https://api.line.me/friendship/v1/status?userIds=${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${LINE_MESSAGING_TOKEN}`,
      },
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      console.error('LINE API error:', data);
      return NextResponse.json({ isFriend: false });
    }
    
    const isFriend = data.friendStatuses?.[0]?.friendFlag || false;
    
    return NextResponse.json({ isFriend });
  } catch (error) {
    console.error('Error checking LINE friend status:', error);
    return NextResponse.json({ isFriend: false });
  }
}