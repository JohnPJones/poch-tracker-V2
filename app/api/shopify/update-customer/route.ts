import { NextRequest, NextResponse } from 'next/server';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

async function shopifyFetch(query: string, variables = {}) {
  const res = await fetch(`https://${SHOPIFY_DOMAIN}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_TOKEN!,
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { customer_id, weight_kg, disease_stage, dob, line_verified, line_user_id, line_marketing_agreed } = await req.json();
    
    if (!customer_id) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
    }
    
    const mutation = `
      mutation updateCustomer($input: CustomerInput!) {
        customerUpdate(input: $input) {
          customer {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    
    const metafields = [];
    
    if (weight_kg) {
      metafields.push({
        namespace: 'custom',
        key: 'weight_kg',
        value: weight_kg.toString(),
        type: 'single_line_text_field'
      });
    }
    
    if (disease_stage) {
      metafields.push({
        namespace: 'custom',
        key: 'disease_stage',
        value: disease_stage,
        type: 'single_line_text_field'
      });
    }
    
    if (dob) {
      metafields.push({
        namespace: 'custom',
        key: 'dob',
        value: dob,
        type: 'single_line_text_field'
      });
    }
    
    if (line_verified !== undefined) {
      metafields.push({
        namespace: 'custom',
        key: 'line_verified',
        value: line_verified.toString(),
        type: 'boolean'
      });
    }
    
    if (line_user_id) {
      metafields.push({
        namespace: 'custom',
        key: 'line_user_id',
        value: line_user_id,
        type: 'single_line_text_field'
      });
    }
    
    if (line_marketing_agreed !== undefined) {
      metafields.push({
        namespace: 'custom',
        key: 'line_marketing_agreed',
        value: line_marketing_agreed.toString(),
        type: 'boolean'
      });
    }
    
    const data = await shopifyFetch(mutation, {
      input: {
        id: `gid://shopify/Customer/${customer_id}`,
        metafields
      }
    });
    
    if (data.data?.customerUpdate?.userErrors?.length > 0) {
      return NextResponse.json({ 
        error: data.data.customerUpdate.userErrors[0].message 
      }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}