import { NextRequest, NextResponse } from 'next/server';

import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });

    if (!token || !token.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const res = await fetch(`https://api.line.me/friendship/v1/status`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('LINE API error:', data);
      return NextResponse.json({ isFriend: false });
    }

    const isFriend = data.friendFlag;

    return NextResponse.json({ isFriend });
  } catch (error) {
    console.error('Error checking LINE friend status:', error);
    return NextResponse.json({ isFriend: false });
  }
}