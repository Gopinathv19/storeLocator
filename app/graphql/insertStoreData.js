import { executeGraphQL } from '../helper/graphqlClient';

// Mutation for inserting store data
export const INSERT_STORE_DATA = `
  mutation InsertStoreData($input: StoreInput!) {
    insertStoreData(input: $input) {
      id
      success
      message
    }
  }
`;

// Function to insert store data
export async function insertStoreData(storeData) {
  try {
    console.log('Attempting to insert stores:', storeData);

    // Format each store for the metaobject creation
    const formattedStores = storeData.map(store => ({
      type: "store_location",
      fields: [
        { key: "store_name", value: store.storeName },
        { key: "address", value: store.address || "" },
        { key: "city", value: store.city || "" },
        { key: "state", value: store.state || "" },
        { key: "zip", value: store.zip || "" },
        { key: "country", value: store.country || "" },
        { key: "phone", value: store.phone || "" },
        { key: "email", value: store.email || "" },
        { key: "hours", value: store.hours || "" },
        { key: "services", value: store.services || "" }
      ]
    }));

    console.log('Formatted stores for Shopify:', formattedStores);

    // Insert each store as a metaobject
    const results = await Promise.all(formattedStores.map(async (store) => {
      const mutation = `
        mutation CreateStoreLocation($input: MetaobjectInput!) {
          metaobjectCreate(metaobject: $input) {
            metaobject {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const response = await executeGraphQL(mutation, { input: store });
      console.log('Store creation response:', response);

      if (response.data?.metaobjectCreate?.userErrors?.length > 0) {
        throw new Error(response.data.metaobjectCreate.userErrors[0].message);
      }

      return {
        id: response.data.metaobjectCreate.metaobject.id,
        success: true,
        message: "Store created successfully"
      };
    }));

    console.log('All stores created:', results);
    return results;
  } catch (error) {
    console.error('Error in insertStoreData:', error);
    throw error;
  }
}

// Define the input type
export const storeInputSchema = `
  input StoreInput {
    stores: [StoreDataInput!]!
  }

  input StoreDataInput {
    storeName: String!
    address: String
    city: String
    state: String
    zip: String
    country: String
    phone: String
    email: String
    hours: String
    services: String
  }
`;