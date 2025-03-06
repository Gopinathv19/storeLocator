import admin from "../shopify.server";
const createMetaobject = async (storeData) => {
    const response = await admin.graphql(
      `#graphql
      mutation CreateMetaobject($metaobject: MetaobjectCreateInput!) {
        metaobjectCreate(metaobject: $metaobject) {
          metaobject {
            handle
            fields {
              key
              value
            }
          }
          userErrors {
            field
            message
            code
          }
        }
      }`,
      {
        variables: {
          metaobject: {
            type: "store_location",
            handle: storeData.storeName.toLowerCase().replace(/\s+/g, '-'),
            fields: [
              { key: "store_name", value: storeData.storeName },
              { key: "address", value: storeData.address },
              { key: "city", value: storeData.city },
              { key: "state", value: storeData.state },
              { key: "zip", value: storeData.zip },
              { key: "country", value: storeData.country },
              { key: "phone", value: storeData.phone },
              { key: "email", value: storeData.email },
              { key: "hours", value: storeData.hours },
              { key: "services", value: storeData.services }
            ]
          }
        }
      }
    );
  
    const data = await response.json();
    if (data.errors) {
      console.error('Error creating metaobject:', data.errors);
    } else {
      console.log('Metaobject created:', data.data.metaobjectCreate.metaobject);
    }
  };

  export default createMetaobject;