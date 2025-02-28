import { planUpdateToDatabase } from "../db_helper/data_insert";
import { shopDetails } from "../helper/storeDetails";
import {planDetails} from '../configs/plan_details_variables'
import featureFlag from '../configs/feature_flag.json'
import pino from 'pino'

const logger = pino();

export const planUpdate = async (admin, planName, index) => {
    const shop = await shopDetails(admin);
    const storeName = shop?.data?.shop?.name;
    const storeDomain = shop?.data?.shop?.myshopifyDomain
    const appHandle = shop?.data?.app?.handle
    logger.info(`${storeName}: Plan Update function is initialized.`);
    try{
        if(planName === 'freePlan'){
            const freePlan = await planUpdateToDatabase(admin, storeName, planName);
            if(freePlan.status === 400){
                logger.error(`${storeName}: ${freePlan.message}: Something went wrong`);
                return {
                    status: freePlan.status, 
                    message: freePlan.message,
                    data: freePlan.data
                }
            }
            logger.info(`${storeName}: ${planName} Plan Updated Successfully`)
            return {
                status: freePlan.status,
                message: freePlan.message, 
                data: freePlan.data
            }
        } else if(planName === planDetails[index].planKey){
            console.log(`The ${planDetails[index].planKey} is clicked`);
            const appSubscription = await admin.graphql(`
                    mutation AppSubscriptionCreate($name: String! $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $test: Boolean!){
                        appSubscriptionCreate(name: $name, returnUrl: $returnUrl, lineItems: $lineItems, test: $test){
                            userErrors {
                                field
                                message
                            }
                            appSubscription {
                                id
                            }
                            confirmationUrl
                        }
                    }
                 
                 `, {variables: {
                    name: planDetails[index].planName,
                    returnUrl: `https://admin.shopify.com/store/${storeName}/apps/${appHandle}/app/onboarding`,
                    lineItems: [
                        {
                            plan: {
                                appRecurringPricingDetails: {
                                    price: {
                                        amount: planDetails[index].amount,
                                        currencyCode: "USD",
                                    },
                                    interval: planName === 'monthlyPlan' ? 'EVERY_30_DAYS' : "ANNUAL"
                                }
                            }
                        }
                    ],
                    test: featureFlag.test_charge
                 }})
                const response = await appSubscription.json();
                const confirmationUrl = response?.data?.appSubscriptionCreate?.confirmationUrl
                const userError = response?.data?.appSubscriptionCreate?.userErrors;
                if(userError.length > 0){
                    logger.error(`${storeName}: ${userError?.message}: Something went wrong`);
                    return {
                        status: 400,
                        message: userError?.message,
                        data: null
                    }
                }
                logger.info(`${storeName}: Choose ${planDetails[index].planName} successfully`);
                return {
                    status: 200,
                    message: "Plan Selected Successfully",
                    data: confirmationUrl
                }

        }

    }catch(error){
        logger.error(`${storeName}: ${error}: something went wrong`);
        return {
            status: 400,
            message: "Something went wrong",
            data: null
        }
    }
    
}