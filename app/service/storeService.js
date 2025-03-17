// Helper function for field key generation
const generateFieldKey = (fieldName) => {
  return fieldName.toLowerCase()
    .trim()
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

const fetchMetaobjectDefinitionDetails = async (admin) => {
  try {
    const response = await admin.graphql(
      `#graphql
      query {
        metaobjectDefinitions(first: 10) {
          edges {
            node {
              id
              type
              fieldDefinitions {
                name
                key
                type
              }
            }
          }
        }
      }`
    );
    
    const data = await response.json();
    if (data.errors) {
      return { status: 500, error: 'Failed to fetch metaobject definition details', details: data.errors };
    }
    
    const storeDefinition = data?.data?.metaobjectDefinitions?.edges?.find(edge => edge.node.type === 'store_location');
    
    if (!storeDefinition) {
      return { status: 404, exists: false };
    }
    
    // Extract field definitions
    const fieldDefinitions = storeDefinition.node.fieldDefinitions.map(field => ({
      name: field.name,
      key: field.key,
      type: field.type
    }));
    
    return { 
      status: 200, 
      exists: true, 
      definitionId: storeDefinition.node.id,
      fieldDefinitions 
    };
  } catch (error) {
    return { status: 500, error: 'Failed to fetch metaobject definition details', details: error.message };
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
              id
              type
              name
              fieldDefinitions {
                name
                key
                type
              }
            }
          }
        }
      }`
    );
    const data = await response.json();
    console.log('Definition check response:', data);

    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    const definitions = data?.data?.metaobjectDefinitions?.edges || [];
    const storeDefinition = definitions.find(edge => edge.node.type === 'store_location');

    return {
      exists: Boolean(storeDefinition),
      definition: storeDefinition?.node,
      fields: storeDefinition?.node?.fieldDefinitions || []
    };
  } catch (error) {
    console.error('Check definition error:', error);
    throw new Error(`Failed to check metaobject definition: ${error.message}`);
  }
};

const createMetaobjectDefinition = async (admin, selectedFields) => {
  try {
    // Validate and transform fields
    const fieldDefinitions = selectedFields.map(field => {
      if (!field) throw new Error('Invalid field name');
      return validateField({ name: field });
    });

    const mutation = `#graphql
      mutation CreateMetaobjectDefinition($input: MetaobjectDefinitionInput!) {
        metaobjectDefinitionCreate(definition: $input) {
          metaobjectDefinition {
            id
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
          }
        }
      }
    `;

    const response = await admin.graphql(mutation, {
      variables: {
        input: {
          name: "Store Location",
          type: "store_location",
          fieldDefinitions
        }
      }
    });

    const result = await response.json();
    console.log('Definition creation result:', result);

    if (result.data?.metaobjectDefinitionCreate?.userErrors?.length > 0) {
      throw new Error(result.data.metaobjectDefinitionCreate.userErrors[0].message);
    }

    return {
      success: true,
      definition: result.data.metaobjectDefinitionCreate.metaobjectDefinition
    };
  } catch (error) {
    console.error('Create definition error:', error);
    throw error;
  }
};

const updateMetaobjectDefinition = async (admin, definitionId, newFields) => {
  try {
    // Get existing definition first
    const definitionResult = await fetchMetaobjectDefinitionDetails(admin);
    
    if (definitionResult.status !== 200) {
      return definitionResult;
    }
    
    // Combine existing fields with new fields, avoiding duplicates
    const existingKeys = definitionResult.fieldDefinitions.map(field => field.key);
    const filteredNewFields = newFields.filter(field => !existingKeys.includes(field.key));
    
    // If no new fields to add, return success
    if (filteredNewFields.length === 0) {
      return { status: 200, message: 'No new fields to add' };
    }
    
    // Prepare combined fields for update
    const allFields = [...definitionResult.fieldDefinitions, ...filteredNewFields];
    
    const response = await admin.graphql(
      `#graphql
      mutation UpdateMetaobjectDefinition($id: ID!, $definition: MetaobjectDefinitionUpdateInput!) {
        metaobjectDefinitionUpdate(id: $id, definition: $definition) {
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
          id: definitionId,
          definition: {
            fieldDefinitions: allFields
          }
        }
      }
    );
    
    const data = await response.json();
    if (data.errors || data?.data?.metaobjectDefinitionUpdate?.userErrors?.length > 0) {
      return {
        status: 500,
        error: 'Failed to update metaobject definition',
        details: data.errors || data?.data?.metaobjectDefinitionUpdate?.userErrors
      };
    }
    
    return { status: 200, success: true };
  } catch (error) {
    return {
      status: 500,
      error: 'Failed to update metaobject definition',
      details: error.message
    };
  }
};

const createStoreMetaobject = async (admin, storeData, fieldDefinitions, retryCount = 0) => {
  try {
    // Transform and validate store data
    const fields = Object.entries(storeData).map(([name, value]) => {
      const fieldDef = fieldDefinitions.find(def => 
        def.name.toLowerCase() === name.toLowerCase() || 
        def.key === generateFieldKey(name)
      );
      
      if (!fieldDef) return null;

      return {
        key: fieldDef.key,
        value: String(value || '').trim()
      };
    }).filter(Boolean);

    if (fields.length === 0) {
      throw new Error('No valid fields found for store creation');
    }

    const mutation = `#graphql
      mutation CreateStoreMetaobject($input: MetaobjectInput!) {
        metaobjectCreate(metaobject: $input) {
          metaobject {
            id
            handle
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await admin.graphql(mutation, {
      variables: {
        input: {
          type: "store_location",
          fields: fields
        }
      }
    });

    const result = await response.json();
    console.log('Store creation result:', result);

    if (result.data?.metaobjectCreate?.userErrors?.length > 0) {
      throw new Error(result.data.metaobjectCreate.userErrors[0].message);
    }

    return {
      success: true,
      store: result.data.metaobjectCreate.metaobject
    };
  } catch (error) {
    // Implement retry logic for transient errors
    if (retryCount < 3 && error.message.includes('network')) {
      console.log(`Retrying store creation (attempt ${retryCount + 1})`);
      return createStoreMetaobject(admin, storeData, fieldDefinitions, retryCount + 1);
    }
    console.error('Create store error:', error);
    throw error;
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