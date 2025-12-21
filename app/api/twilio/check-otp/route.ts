import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

const client = twilio(accountSid, authToken);

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = await req.json();

    if (!phone || !code) {
      return NextResponse.json({ error: 'Phone number and code are required' }, { status: 400 });
    }
    if (!verifySid) {
      console.error('Twilio Verify Service SID is not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Format phone number to E.164
    let formattedPhone = phone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = `+66${formattedPhone.substring(1)}`;
    }

    const verificationCheck = await client.verify.v2.services(verifySid)
      .verificationChecks
      .create({ to: formattedPhone, code: code });

    if (verificationCheck.status === 'approved') {
      return NextResponse.json({ success: true, status: verificationCheck.status });
    } else {
      return NextResponse.json({ success: false, status: verificationCheck.status }, { status: 400 });
    }

  } catch (error) {
    console.error('Twilio check OTP error:', error);
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
}
