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

export async function getCustomerByPhone(phone: string) {
  const query = `
    query getCustomer($query: String!) {
      customers(first: 5, query: $query, sortKey: UPDATED_AT, reverse: true) {
        edges {
          node {
            id
            phone
            firstName
            lastName
            displayName
            updatedAt
            metafields(first: 20) {
              edges {
                node {
                  namespace
                  key
                  value
                }
              }
            }
          }
        }
      }
    }
  `;
  
  const data = await shopifyFetch(query, { query: `phone:${phone}` });
  
  // หาลูกค้าที่ยังใช้เบอร์นี้อยู่ (phone ตรงกับที่ search)
  const customers = data.data?.customers?.edges || [];
  const customer = customers.find((edge: any) => edge.node.phone === phone)?.node || customers[0]?.node;
  
  if (!customer) return null;
  
  const metafields = customer.metafields.edges.reduce((acc: any, { node }: any) => {
    // ใช้ key อย่างเดียว ไม่สน namespace
    acc[node.key] = node.value;
    return acc;
  }, {});
  
  // Debug: ดูข้อมูลจริง
  console.log('Customer ID:', customer.id);
  console.log('Phone:', customer.phone);
  console.log('All Metafields:', metafields);
  
  // หา disease_stage จาก metafield ที่มี
  const diseaseStage = metafields.disease_stage || metafields.disease_status || metafields.ckd_stage || '';
  console.log('Disease Stage Found:', diseaseStage);
  
  // คำนวณอายุจาก dob
  const dob = metafields.dob ? new Date(metafields.dob) : null;
  const age = dob ? new Date().getFullYear() - dob.getFullYear() : 0;
  
  // คำนวณโปรตีนเป้าหมาย
  const weight = parseFloat(metafields.weight_kg || metafields.weight || '60');
  const stage = diseaseStage;
  
  // แก้ไข: เช็คทั้ง Pre-Dial, PreDial, Pre Dial
  const isPreDial = stage.toLowerCase().replace(/[-_\s]/g, '').includes('pre');
  const proteinRatio = isPreDial ? 0.7 : 1.1;
  const dailyProtein = Math.round(weight * proteinRatio);
  
  console.log('Weight:', weight, 'Stage:', stage, 'isPreDial:', isPreDial, 'Protein Target:', dailyProtein);
  
  return {
    customer_id: customer.id.split('/').pop(),
    phone: customer.phone || phone,
    name: customer.firstName || customer.displayName || 'ลูกค้า',
    age,
    weight_kg: weight,
    disease_stage: stage,
    daily_protein_target: dailyProtein,
  };
}

export async function getCustomerOrders(customerId: string) {
  const query = `
    query getOrders($customerId: ID!) {
      customer(id: $customerId) {
        orders(first: 50, query: "created_at:>-14d") {
          edges {
            node {
              lineItems(first: 50) {
                edges {
                  node {
                    product {
                      id
                      title
                      metafields(first: 10) {
                        edges {
                          node {
                            key
                            value
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  
  const data = await shopifyFetch(query, { 
    customerId: `gid://shopify/Customer/${customerId}` 
  });
  
  const products = new Map();
  
  data.data?.customer?.orders?.edges.forEach(({ node }: any) => {
    node.lineItems.edges.forEach(({ node: item }: any) => {
      const product = item.product;
      if (!product) return;
      
      const metafields = product.metafields.edges.reduce((acc: any, { node }: any) => {
        if (node.key === 'custom_nutrients') {
          acc.custom_nutrients = JSON.parse(node.value);
        }
        return acc;
      }, {});
      
      const productId = product.id.split('/').pop();
      if (!products.has(productId)) {
        products.set(productId, {
          id: productId,
          name: product.title,
          protein_g: metafields.custom_nutrients?.protein_g || 0,
        });
      }
    });
  });
  
  return Array.from(products.values());
}