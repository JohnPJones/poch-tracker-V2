import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

const client = twilio(accountSid, authToken);

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }
    if (!verifySid) {
      console.error('Twilio Verify Service SID is not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const verification = await client.verify.v2.services(verifySid)
      .verifications
      .create({ to: phone, channel: 'sms' });

    console.log('Twilio verification status:', verification.status);

    return NextResponse.json({ success: true, sid: verification.sid });

  } catch (error) {
    console.error('Twilio send OTP error:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
