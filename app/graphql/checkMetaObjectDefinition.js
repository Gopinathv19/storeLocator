import { json } from '@remix-run/node';

export const checkMetaobjectDefinition = async (admin) => {
    try {
      const response = await admin.graphql(
        `#graphql
        query {
          metaobjectDefinitions(first: 10) {
            edges {
              node {
                type
              }
            }
          }
        }`
      );
      const data = await response.json();
      if(data.errors){
        return {status : 500 , error : 'Failed to check metaobject definition',details : data.errors}
      }
      const storeDefinition = data?.data?.metaobjectDefinitions?.edges?.find(edge => edge.node.type === 'store_location');
      return {status : 200 , exists : !!storeDefinition};
    } catch (error) {
      return {status : 500 , error : 'Failed to check metaobject definition',details : error.message}
    }
  }