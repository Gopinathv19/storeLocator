import pino from "pino";
const logger = pino();

export const shopDetails = async (admin) => {
  try {
    const response = await admin.graphql(
      `
                query{
                    shop{
                        name
                        email
                        myshopifyDomain
                        billingAddress{
                          countryCodeV2
                        }
                    }
                        app{
                          title
                          handle
                        }
                }
            `,
    );
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error(error, "Shop details fetched failed or Something went wrong.");
  }
};
