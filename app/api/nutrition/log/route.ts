import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { insertNutritionLog } from '@/lib/bigquery';

export async function POST(req: NextRequest) {
  try {
    const { 
      customer_id, 
      eat_protein, 
      eat_calories,
      eat_carbs,
      eat_fat,
      eat_product_id 
    } = await req.json();
    
    if (!customer_id || !eat_protein || !eat_calories || !eat_carbs || !eat_fat) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const log = await insertNutritionLog({
      log_id: uuidv4(),
      customer_id,
      eat_time: new Date(),
      eat_protein: parseFloat(eat_protein),
      eat_calories: parseFloat(eat_calories),
      eat_carbs: parseFloat(eat_carbs),
      eat_fat: parseFloat(eat_fat),
      eat_product_id,
    });
    
    return NextResponse.json(log);
  } catch (error) {
    console.error('Error inserting log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}