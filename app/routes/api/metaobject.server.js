import { json } from '@remix-run/node';
import { authenticate } from "../../shopify.server";

// Check if metaobject definition exists
export const checkMetaobjectDefinition = async (request) => {
  const { admin } = await authenticate.admin(request);
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
    if (data.errors) {
      throw new Error('Failed to check metaobject definition');
    }
    const definitions = data.data.metaobjectDefinitions.edges.map(edge => edge.node.type);
    return json({ exists: definitions.includes("store_location") });
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
};

// Create metaobject definition
export const createMetaobjectDefinition = async (request) => {
  const { admin } = await authenticate.admin(request);
  try {
    const response = await admin.graphql(
      `#graphql
      mutation CreateMetaobjectDefinition($definition: MetaobjectDefinitionCreateInput!) {
        metaobjectDefinitionCreate(definition: $definition) {
          metaobjectDefinition {
            name
            type
            fieldDefinitions {
              name
              key
              type
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
          definition: {
            name: "Store Location",
            type: "store_location",
            fieldDefinitions: [
              { name: "Store Name", key: "store_name", type: "single_line_text_field" },
              { name: "Address", key: "address", type: "multi_line_text_field" },
              { name: "City", key: "city", type: "single_line_text_field" },
              { name: "State", key: "state", type: "single_line_text_field" },
              { name: "ZIP", key: "zip", type: "single_line_text_field" },
              { name: "Country", key: "country", type: "single_line_text_field" },
              { name: "Phone", key: "phone", type: "single_line_text_field" },
              { name: "Email", key: "email", type: "single_line_text_field" },
              { name: "Hours", key: "hours", type: "multi_line_text_field" },
              { name: "Services", key: "services", type: "multi_line_text_field" }
            ]
          }
        }
      }
    );

    const data = await response.json();
    if (data.errors) {
      throw new Error('Failed to create metaobject definition');
    }
    return json({ success: true });
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
};

// Fetch stores
export const fetchStores = async (request) => {
  const { admin } = await authenticate.admin(request);
  try {
    const response = await admin.graphql(
      `#graphql
      query {
        metaobjects(type: "store_location", first: 50) {
          edges {
            node {
              handle
              fields {
                key
                value
              }
            }
          }
        }
      }`
    );

    const data = await response.json();
    if (data.errors) {
      throw new Error('Failed to fetch stores');
    }

    const stores = data.data.metaobjects.edges.map(edge => {
      const store = {};
      edge.node.fields.forEach(field => {
        store[field.key] = field.value;
      });
      return store;
    });

    return json({ stores });
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
};

// Create a single store metaobject
export const createStoreMetaobject = async (request, storeData) => {
  const { admin } = await authenticate.admin(request);
  try {
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
    if (data.errors || data.data.metaobjectCreate.userErrors.length > 0) {
      const errors = data.errors || data.data.metaobjectCreate.userErrors;
      throw new Error(JSON.stringify(errors));
    }
    return json({ success: true, store: data.data.metaobjectCreate.metaobject });
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
};
