import { shopDetails } from "../helper/storeDetails";
import {fetchPaymentDetailsFromDb} from '../db_helper/data_fetch'
import pino from 'pino'

const logger = pino();

export const fetchPlanDetails = async (admin) => {
    const shop = await shopDetails(admin);
    const storeName = shop?.data?.shop?.name;
    logger.info(`${storeName}: Plan Details fetching function is initialized.`);
    try{
        const planName = await fetchPaymentDetailsFromDb(storeName)
        if(planName.status !== 200){
            logger.error(`${storeName}: ${planName.message}: Something went wrong`);
            return{
                status: planName.status,
                message: planName.message, 
                data: planName.data
            }
        }
        logger.info(`${storeName}: ${planName.message}: PlanDetails Fetched successfully`);
            return{
                status: planName.status,
                message: planName.message, 
                data: planName.data
            }
    }catch(error){
        logger.error(`${storeName}: ${error}: Something went wrong`);
        return {
            status: 400,
            message: "Something went wrong",
            data: null
        }
    }
}