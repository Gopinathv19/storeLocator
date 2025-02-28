import { authenticate } from "../shopify.server";
import db from "../db.server";
import pino from 'pino';
import { supabase } from "../db/supabase_initialize";
import {json} from '@remix-run/node'

const logger = pino();

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);
  if (session) {
  const {data: storeData, error: storeDataError} = await supabase.from('stores').update({plan_name: null, is_free_planned: false, charge_id: null, payment_status: null}).eq('store_domain', shop)
  if(storeDataError){
    logger.error(`${shop}: ${storeDataError.message}: Something went wrong`);
    return json({
      status: 400,
      message: "something went wrong",
      data: null,
    })
  }
  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  logger.info(`${shop}: App Uninstalled successfully`)
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response();
};
