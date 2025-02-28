import { shopDetails } from "../helper/storeDetails";
import pino from 'pino'
import { saveChargeId } from "../db_helper/data_insert";


const logger = pino();

export const savePlanDetailsToDatabase = async (admin) => {
    
    const shop = await shopDetails(admin);
    const storeName = shop?.data?.shop?.name;
    logger.info(`${storeName}: Plan details save to database function is initialized.`);
    try{
        const appSubscriptionFetch = await admin.graphql(`
                query {
                   currentAppInstallation{
                    activeSubscriptions{
                        id
                        status
                        name
                    }
                   } 
                }
            `)
        const response = await appSubscriptionFetch.json();
        const paymentStatus = response?.data?.currentAppInstallation?.activeSubscriptions[0]?.status;
        const paymentId = response?.data?.currentAppInstallation?.activeSubscriptions[0]?.id
        const planName = response?.data?.currentAppInstallation?.activeSubscriptions[0]?.name
        
        if(response?.data?.currentAppInstallation?.activeSubscriptions.length === 0){
            return {
                status: 400,
                message: "You still haven't select any paid plan",
                data: null
            }
        }
        const savePlanDetails = await saveChargeId(storeName, paymentStatus, paymentId, planName);
        if(savePlanDetails.status !== 200){
            logger.info(`${storeName}: ${savePlanDetails.message}: Something went wrong`);
            return {
                status: savePlanDetails.status,
                message: savePlanDetails.message,
                data: savePlanDetails.data
            }
        }
        logger.info(`${storeName}: Plan Details saves successfully`);
        return {
            status: savePlanDetails.status,
            message: savePlanDetails.message,
            data: savePlanDetails.data
        }
    }catch(error){
        logger.error(`${storeName}: ${error}: Something went wrong to update the plan details on Database`);
        return {
            status: 400,
            message: "Something went wrong",
            data: null
        }
    }
}