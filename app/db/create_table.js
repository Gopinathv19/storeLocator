import { pool } from "./supabase_table_create_helper";
import pino from "pino";
import { stores } from "./schema";
import {shopDetails} from '../helper/storeDetails'

const logger = pino();

export async function createTable(admin) {
  const client = await pool.connect();
  const shop = await shopDetails(admin);
  const storeName = shop?.data?.shop?.name;
  try {
    await client.query(stores);
    logger.info(`${storeName}: Stores Table created Successfully`);
  } catch (error) {
    logger.error(
      `${storeName}: ${error}: Something went wrong to create the table.`,
    );
  }
}
