import { json } from "@remix-run/node";
import { buildSchema } from 'graphql';
import { graphql } from 'graphql';
import { createStoreLocationDefinition } from "../graphql/createMetaObjectDefinition";

const schema = buildSchema(`
  type Store {
    id: ID!
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

  input StoreInput {
    stores: [StoreDataInput!]!
  }

  type StoreResponse {
    id: ID!
    success: Boolean!
    message: String
  }

  type MetaobjectDefinitionResponse {
    success: Boolean!
    message: String
    id: ID
  }

  type Query {
    getStoresDetails: [Store]
  }

  type Mutation {
    insertStoreData(input: StoreInput!): StoreResponse
    createStoreLocationDefinition: MetaobjectDefinitionResponse
  }
`);

const root = {
  getStoresDetails: async (_, context) => {
    // Implement your store fetching logic here
    return []; // Return your stores data
  },
  insertStoreData: async ({ input }, context) => {
    // Implement your store insertion logic here
    return {
      id: "new-store-id",
      success: true,
      message: "Store data inserted successfully"
    };
  },
  createStoreLocationDefinition: async (_, context) => {
    try {
      const result = await createStoreLocationDefinition(context.request);
      return {
        success: true,
        message: "Metaobject definition created successfully",
        id: result.id
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        id: null
      };
    }
  }
};

export async function action({ request }) {
  if (request.method === "POST") {
    const body = await request.json();
    try {
      const response = await graphql({
        schema,
        source: body.query,
        variableValues: body.variables,
        rootValue: root,
        contextValue: { request }
      });

      if (response.errors) {
        return json({ errors: response.errors }, { status: 400 });
      }

      return json(response);
    } catch (error) {
      return json({ errors: [{ message: error.message }] }, { status: 500 });
    }
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}

export let loader = action;