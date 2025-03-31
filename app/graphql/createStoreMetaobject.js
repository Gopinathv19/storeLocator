import { json } from '@remix-run/node';
export const createStoreMetaobject = async (admin, storeData) => {
    try {
  
      const schemaType = storeData.schema_reference;
      if(!schemaType){
        return {
          status: 500,
          error: 'Schema type is required',
          details: 'Schema type is required'
        };
      }
  
      const {schema_reference, ...fieldData} = storeData;
  
      // Transform store data into fields array dynamically
      const fields = Object.entries(fieldData).map(([key, value]) => ({
        key: key.toLowerCase().replace(/\s+/g, '_'),
        value: value?.toString() || ''
      }));
    
      console.log("Creating metaobject with schema:", schemaType); // Debug log
      console.log("Fields:", fields);
  
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
              type: schemaType,
              fields: fields
            }
          }
        }
      );
  
      const data = await response.json();
      if (data.errors || data?.data?.metaobjectCreate?.userErrors?.length > 0) {
        return {
          status: 500,
          error: 'Failed to create store metaobject',
          details: data.errors || data?.data?.metaobjectCreate?.userErrors
        };
      }
  
      return {
        status: 200,
        data: data?.data?.metaobjectCreate?.metaobject
      };
    } catch (error) {
      return {
        status: 500,
        error: 'Failed to create store metaobject',
        details: error.message
      };
    }
  };