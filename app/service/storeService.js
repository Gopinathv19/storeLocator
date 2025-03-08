import { json } from '@remix-run/node';
 

const checkMetaobjectDefinition = async (admin) => {
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
    const storeDefinition = data.data.metaobjectDefinitions.edges.find(edge => edge.node.type === 'store_location');
    return {status : 200 , exists : !!storeDefinition};
  } catch (error) {
    return {status : 500 , error : 'Failed to check metaobject definition',details : error.message}
  }
}

export const createMetaobjectDefinition = async (request) => {
  const { admin } = await authenticate.admin(request); // Authenticate the user
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
    if (data.errors || data.data.metaobjectDefinitionCreate.userErrors.length > 0) {
      const errors = data.errors || data.data.metaobjectDefinitionCreate.userErrors;
      throw new Error(JSON.stringify(errors));
    }
    return json({ success: true }); // Return success response
  } catch (error) {
    return json({ error: error.message }, { status: 500 }); // Return error response
  }
};


 

const fetchStores = async (admin) =>{
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

  if(data.errors){
    return {status : 500 , error : 'Failed to fetch stores',details : data.errors}
  }

  const stores = data.data.metaobjects.edges.map(edge =>{
    const store = {};
    edge.node.fields.forEach(field =>{
      store[field.key] = field.value;
    })
    return store;
  });
  return {status : 200,stores};

}

export {fetchStores,checkMetaobjectDefinition,createMetaobjectDefinition};

  