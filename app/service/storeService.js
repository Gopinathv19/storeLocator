const generateFieldKey = (fieldName) => {
  if (!fieldName || typeof fieldName !== 'string') {
    throw new Error(`Invalid field name: ${fieldName}`);
  }
  
  // Generate a valid key
  return fieldName.toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^[^a-z]/, 'f$&')
    .replace(/_+/g, '_')
    .substring(0, 64);
};


// Helper for field validation
const validateField = (field) => {
  if (!field.name || typeof field.name !== 'string') {
    throw new Error(`Invalid field name: ${field.name}`);
  }
  return {
    name: field.name.trim(),
    key: field.key || generateFieldKey(field.name),
    type: field.type || "single_line_text_field"
  };
};

// helper function to log the output 
const logGraphQLResponse = (response, context) => {
  console.log(`${context} Response:`, {
    status: response.status,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries()),
    url: response.url
  });
};

const fetchStores = async (admin) => {
  try {
    const response = await admin.graphql(
      `#graphql
      query {
        metaobjects(type: "store_location", first: 50) {
          edges {
            node {
              id
              handle
              fields {
                key
                value
                definition {
                  name
                }
              }
            }
          }
        }
      }`
    );
    logGraphQLResponse(response, 'Fetch stores');
    const data = await response.json();
    console.log('Fetch stores response:', data);

    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    // Transform the data into a more usable format
    const stores = data.data.metaobjects.edges.map(edge => {
      const store = {
        id: edge.node.id,
        handle: edge.node.handle
      };

      // Map fields using their original names
      edge.node.fields.forEach(field => {
        const fieldName = field.definition.name.toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '_');
        store[fieldName] = field.value;
      });

      return store;
    });

    return {
      status: 200,
      stores,
      count: stores.length
    };

  } catch (error) {
    console.error('Fetch stores error:', error);
    return {
      status: 500,
      error: 'Failed to fetch stores',
      details: error.message
    };
  }
};


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
    logGraphQLResponse(response, 'Check metaobject definition');

    const data = await response.json();
    if(data.errors){
      return {status: 500, error: 'Failed to check metaobject definition', details: data.errors}
    }

    const storeDefinition = data?.data?.metaobjectDefinitions?.edges?.find(edge => edge.node.type === 'store_location');
    return {status: 200, exists: !!storeDefinition};
    
  } catch (error) {
    return {status: 500, error: 'Failed to check metaobject definition', details: error.message}
  }
};

const createMetaobjectDefinition = async (admin, selectedFields) => {
  try {
    console.log('Creating definition with fields:', selectedFields);
    
    if (!selectedFields || !selectedFields.length) {
      return {status: 400, error: 'No fields provided for definition'}
    }

    const fieldDefinitions = selectedFields.map(fieldName => ({
      name: fieldName,
      key: generateFieldKey(fieldName),
      type: {
        name: "multi_line_text_field"
      }
    }));

    console.log('Field definitions:', fieldDefinitions);

    const response = await admin.graphql(
      `#graphql
      mutation createMetaobjectDefinition($input: MetaobjectDefinitionCreateInput!) {
        metaobjectDefinitionCreate(definition: $input) {
          metaobjectDefinition {
            id
            type {
              name
            }
            fieldDefinitions {
              name
              key
              type {
                name
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          input: {
            name: "Store Location",
            type: "store_location",
            fieldDefinitions
          }
        }
      }
    );
    logGraphQLResponse(response, 'Create metaobject definition');
    const data = await response.json();
    console.log('Definition creation response:', data);
    
    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      throw new Error(data.errors[0].message);
    }

    if (data?.data?.metaobjectDefinitionCreate?.userErrors?.length > 0) {
      const errors = data.data.metaobjectDefinitionCreate.userErrors;
      console.error('User errors:', errors);
      throw new Error(errors[0].message);
    }

    return {
      status: 200,
      success: true,
      definition: data.data.metaobjectDefinitionCreate.metaobjectDefinition
    };
  } catch (error) {
    console.error('Create definition error:', error);
    return {
      status: 500,
      success: false,
      error: error.message
    };
  }
};

 

const createStoreMetaobject = async (admin, storeData, fieldDefinitions) => {
  try {
    console.log('Creating store with data:', storeData);
    
    if (!storeData || typeof storeData !== 'object') {
      throw new Error('Invalid store data');
    }

    // Create a map for field name to key lookup
    const fieldKeyMap = {};
    fieldDefinitions.forEach(def => {
      fieldKeyMap[def.name.toLowerCase()] = def.key;
    });

    // Build fields array from store data
    const fields = [];
    for (const [name, value] of Object.entries(storeData)) {
      const key = fieldKeyMap[name.toLowerCase()];
      if (key) {
        fields.push({
          key: key,
          value: String(value || '').trim()
        });
      } else {
        console.log(`Field "${name}" not found in definition, skipping`);
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields found for store creation');
    }

    console.log('Store fields:', fields);

    // Determine a handle from the first field or use a timestamp
    const firstFieldValue = Object.values(storeData)[0] || '';
    const handle = firstFieldValue.toString().toLowerCase().replace(/\s+/g, '-') || 
                  `store-${Date.now()}`;

    const response = await admin.graphql(
      `#graphql
      mutation CreateStoreMetaobject($input: MetaobjectInput!) {
        metaobjectCreate(metaobject: $input) {
          metaobject {
            id
            handle
            fields {
              key
              value
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          input: {
            type: "store_location",
            fields: fields
          }
        }
      }
    );
    logGraphQLResponse(response, 'Create store metaobject');
    const data = await response.json();
    console.log('Store creation response:', data);
    
    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      throw new Error(data.errors[0].message);
    }

    if (data?.data?.metaobjectCreate?.userErrors?.length > 0) {
      const errors = data.data.metaobjectCreate.userErrors;
      console.error('User errors:', errors);
      throw new Error(errors[0].message);
    }

    return {
      status: 200,
      success: true,
      store: data.data.metaobjectCreate.metaobject
    };
  } catch (error) {
    console.error('Create store error:', error);
    return {
      status: 500,
      success: false,
      error: error.message
    };
  }
};

export {
  checkMetaobjectDefinition,
  createMetaobjectDefinition,
  updateMetaobjectDefinition,
  createStoreMetaobject,
  fetchStores,
  fetchMetaobjectDefinitionDetails
};


