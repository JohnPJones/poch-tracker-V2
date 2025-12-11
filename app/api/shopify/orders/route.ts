import { NextRequest, NextResponse } from 'next/server';
import { getCustomerOrders } from '@/lib/shopify';

export async function GET(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get('customerId');
    
    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
    }
    
    const products = await getCustomerOrders(customerId);
    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}