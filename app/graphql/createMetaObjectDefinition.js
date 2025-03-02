import { authenticate } from "../shopify.server";

const CREATE_METAOBJECT_DEFINITION = `
  mutation {
    metaobjectDefinitionCreate(
      definition: {
        name: "Store Location"
        type: "store_location"
        fieldDefinitions: [
          { name: "Store Name", key: "store_name", type: "single_line_text_field", required: true },
          { name: "Address", key: "address", type: "single_line_text_field", required: true },
          { name: "City", key: "city", type: "single_line_text_field", required: true },
          { name: "State", key: "state", type: "single_line_text_field", required: true },
          { name: "ZIP", key: "zip", type: "single_line_text_field", required: true },
          { name: "Country", key: "country", type: "single_line_text_field", required: true },
          { name: "Phone", key: "phone", type: "single_line_text_field", required: true },
          { name: "Email", key: "email", type: "single_line_text_field", required: true },
          { name: "Hours", key: "hours", type: "multi_line_text_field", required: true },
          { name: "Services", key: "services", type: "multi_line_text_field", required: false }
        ]
      }
    ) {
      metaobjectDefinition {
        id
        type
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export async function createStoreLocationDefinition(request) {
  const { admin } = await authenticate.admin(request);
  try {
    const response = await admin.graphql(CREATE_METAOBJECT_DEFINITION);
    if (response.errors) throw new Error(response.errors[0].message);
    return response.metaobjectDefinitionCreate;
  } catch (error) {
    return { success: false, message: error.message, id: null };
  }
}

const UPDATE_METAOBJECT_DEFINITION = `
  mutation UpdateMetaobjectDefinition($id: ID!, $input: MetaobjectUpdateInput!) {
    metaobjectUpdate(id: $id, input: $input) {
      metaobject {
        id
        type
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export async function updateStoreLocationDefinition(request, id, input) {
  const { admin } = await authenticate.admin(request);
  try {
    const response = await admin.graphql(UPDATE_METAOBJECT_DEFINITION, { id, input });
    if (response.errors) throw new Error(response.errors[0].message);
    return response.metaobjectUpdate;
  } catch (error) {
    return { success: false, message: error.message, id: null };
  }
}

const DELETE_METAOBJECT_DEFINITION = `
  mutation DeleteMetaobjectDefinition($id: ID!) {
    metaobjectDelete(id: $id) {
      deletedId
      userErrors {
        field
        message
      }
    }
  }
`;

export async function deleteStoreLocationDefinition(request, id) {
  const { admin } = await authenticate.admin(request);
  try {
    const response = await admin.graphql(DELETE_METAOBJECT_DEFINITION, { id });
    if (response.errors) throw new Error(response.errors[0].message);
    return response.metaobjectDelete;
  } catch (error) {
    return { success: false, message: error.message, id: null };
  }
}

const GET_METAOBJECTS_QUERY = `
  query {
    metaobjects(type: "store_location", first: 10) {
      edges {
        node {
          id
          fields {
            key
            value
          }
        }
      }
    }
  }
`;

export async function getStoresDetails(request) {
  const { admin } = await authenticate.admin(request);
  try {
    const response = await admin.graphql(GET_METAOBJECTS_QUERY);
    if (response.errors) throw new Error(response.errors[0].message);
    
    const stores = response.metaobjects.edges.map(({ node }) => {
      let storeData = { id: node.id };
      node.fields.forEach(field => {
        storeData[field.key] = field.value;
      });
      return storeData;
    });

    return stores;
  } catch (error) {
    return [];
  }
}
