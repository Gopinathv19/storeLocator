import { json } from "@remix-run/node";
import { buildSchema } from "graphql";
import { graphql } from "graphql";
import {
  createStoreLocationDefinition,
  updateStoreLocationDefinition,
  deleteStoreLocationDefinition,
  getStoresDetails,
} from "../graphql/createMetaObjectDefinition";

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
    createStoreLocationDefinition: MetaobjectDefinitionResponse
    updateStoreLocationDefinition(id: ID!, input: StoreDataInput!): MetaobjectDefinitionResponse
    deleteStoreLocationDefinition(id: ID!): MetaobjectDefinitionResponse
  }
`);

const root = {
  getStoresDetails: async (_, context) => {
    return await getStoresDetails(context.request);
  },
  createStoreLocationDefinition: async (_, context) => {
    return await createStoreLocationDefinition(context.request);
  },
  updateStoreLocationDefinition: async ({ id, input }, context) => {
    return await updateStoreLocationDefinition(context.request, id, input);
  },
  deleteStoreLocationDefinition: async ({ id }, context) => {
    return await deleteStoreLocationDefinition(context.request, id);
  },
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
        contextValue: { request },
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
