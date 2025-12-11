import { NextRequest, NextResponse } from 'next/server';
import { getNutritionLogs } from '@/lib/bigquery';

export async function GET(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get('customerId');
    const date = req.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
    }
    
    const logs = await getNutritionLogs(customerId, date);
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}