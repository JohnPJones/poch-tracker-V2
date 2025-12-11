import { BigQuery } from '@google-cloud/bigquery';

// ใช้ไฟล์ service account แทน JSON string
const bigquery = new BigQuery({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const dataset = bigquery.dataset(process.env.GCP_DATASET_ID!);
const table = dataset.table(process.env.GCP_TABLE_ID!);

export async function insertNutritionLog(log: {
  log_id: string;
  customer_id: string;
  eat_time: Date;
  eat_protein: number;
  eat_product_id?: string;
}) {
  try {
    await table.insert([log]);
    return log;
  } catch (error) {
    console.error('BigQuery insert error:', error);
    throw error;
  }
}

export async function getNutritionLogs(customerId: string, date: string) {
  try {
    const query = `
      SELECT 
        log_id,
        customer_id,
        DATETIME(eat_time, 'Asia/Bangkok') as eat_time,
        eat_protein,
        eat_product_id
      FROM \`${process.env.GCP_PROJECT_ID}.${process.env.GCP_DATASET_ID}.${process.env.GCP_TABLE_ID}\`
      WHERE customer_id = @customerId
        AND DATE(eat_time, 'Asia/Bangkok') = @date
      ORDER BY eat_time DESC
    `;
    
    const [rows] = await bigquery.query({
      query,
      params: { customerId, date },
    });
    
    return rows;
  } catch (error) {
    console.error('BigQuery query error:', error);
    return [];
  }
}