import { shopDetails } from "../helper/storeDetails";
import { v4 as uuidv4 } from "uuid";
import { storeDataInsert } from "../db_helper/data_insert";
import pino from "pino";
import { encodeToken } from "../helper/encodeAndDecodeAccessToken";

const logger = pino();

export const saveStoreData = async (admin) => {
  const shop = await shopDetails(admin);
  const storeName = shop?.data?.shop?.name;
  const storeDomain = shop?.data?.shop?.myshopifyDomain;
  const storeEmail = shop?.data?.shop?.email;
  const uuid = uuidv4();
  const accessToken = admin?.rest?.session?.accessToken;
  const encodedToken = encodeToken(accessToken);

  logger.info(
    `${storeName}: Save Store Data function is initialized (Save Store Data)`,
  );
  try {
    const storeData = await storeDataInsert(
      storeName,
      storeDomain,
      storeEmail,
      uuid,
      encodedToken,
    );
    if(storeData.status === 400){
      logger.error(`${storeName}: ${storeData.message}: Something went wrong to Insert the store Data`)
      return {
        status: 400,
        message: "Something went wrong",
        data: null
      }
    }
    logger.info(`${storeName}: Store Data Inserted successfully...`)
    
    return {
      status: storeData.status,
      message: storeData.message,
      data: storeData.data,
    };
  } catch (error) {
    logger.error(
      `${storeName}: ${error}: Something went wrong to save the storeData (Save Store Data)`,
    );
    return {
      status: 400,
      message: "Something went wrong",
      data: null,
    };
  }
};
