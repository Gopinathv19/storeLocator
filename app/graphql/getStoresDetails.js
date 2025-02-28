import { buildSchema } from 'graphql';
import { executeGraphQL } from '../helper/graphqlClient';

// Define the schema
export const storeSchema = buildSchema(`
  type Store {
    id: ID!
    name: String
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

  type Query {
    getStoresDetails: [Store]
  }
`);

// Define the query
export const GET_STORES_DETAILS = `
  query GetStoresDetails {
    metaobjects(type: "store_location", first: 250) {
      nodes {
        id
        fields {
          key
          value
        }
      }
    }
  }
`;

// Function to fetch store data
export async function getStoresDetails(request) {
  try {
    console.log('Fetching stores from Shopify...');
    const response = await executeGraphQL(GET_STORES_DETAILS, {}, request);
    console.log('Raw Shopify response:', response);

    const stores = response.data.metaobjects.nodes.map(node => {
      console.log('Processing node:', node);
      const fields = node.fields.reduce((acc, field) => {
        acc[field.key] = field.value;
        return acc;
      }, {});
      console.log('Processed fields:', fields);

      return {
        id: node.id,
        storeName: fields.store_name,
        address: fields.address,
        city: fields.city,
        state: fields.state,
        zip: fields.zip,
        country: fields.country,
        phone: fields.phone,
        email: fields.email,
        hours: fields.hours,
        services: fields.services
      };
    });

    console.log('Processed stores:', stores);
    return stores;
  } catch (error) {
    console.error('Error in getStoresDetails:', error);
    throw error;
  }
}

 