import { NextRequest, NextResponse } from 'next/server';
import { getCustomerByPhone } from '@/lib/shopify';

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();
    
    if (!phone) {
      return NextResponse.json({ error: 'Phone required' }, { status: 400 });
    }
    
    const customer = await getCustomerByPhone(phone);
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    
    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}