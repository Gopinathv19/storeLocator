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
    const storeDefinition = data?.data?.metaobjectDefinitions?.edges?.find(edge => edge.node.type === 'store_location');
    return {status : 200 , exists : !!storeDefinition};
  } catch (error) {
    return {status : 500 , error : 'Failed to check metaobject definition',details : error.message}
  }
}

export const createMetaobjectDefinition = async (admin, fieldDefinitions) => {
  try {
    // Transform the field definitions into the required format
    const formattedFields = fieldDefinitions.map(field => ({
      name: field.name,
      key: field.name.toLowerCase().replace(/\s+/g, '_'),
      type: "single_line_text_field" // Default type, can be made dynamic if needed
    }));

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
            fieldDefinitions: formattedFields
          }
        }
      }
    );

    const data = await response.json();
    if (data.errors || data?.data?.metaobjectDefinitionCreate?.userErrors?.length > 0) {
      return {
        status: 500,
        error: 'Failed to create metaobject definition',
        details: data.errors || data?.data?.metaobjectDefinitionCreate?.userErrors
      };
    }
    return { status: 200, success: true };
  } catch (error) {
    return {
      status: 500,
      error: 'Failed to create metaobject definition',
      details: error.message
    };
  }
};

const fetchMetaobjectDefinition = async (admin) => {
  try {
    const response = await admin.graphql(
      `#graphql
      query {
        metaobjectDefinitions(first: 10) {
          edges {
            node {
              type
              fieldDefinitions {
                name
                key
                type
                required
              }
            }
          }
        }
      }`
    );

    const data = await response.json();
    if (data.errors) {
      return {
        status: 500,
        error: 'Failed to fetch metaobject definition',
        details: data.errors
      };
    }

    const storeDefinition = data?.data?.metaobjectDefinitions?.edges?.find(
      edge => edge.node.type === 'store_location'
    );

    if (!storeDefinition) {
      return {
        status: 404,
        error: 'Store location definition not found'
      };
    }

    return {
      status: 200,
      definition: storeDefinition.node.fieldDefinitions
    };
  } catch (error) {
    return {
      status: 500,
      error: 'Failed to fetch metaobject definition',
      details: error.message
    };
  }
};

const validateStoreData = (storeData, definitionFields) => {
  const errors = [];
  
  // Check for required fields
  definitionFields.forEach(field => {
    if (field.required && !storeData[field.key]) {
      errors.push(`Missing required field: ${field.name}`);
    }
  });

  // Check for data type consistency
  definitionFields.forEach(field => {
    const value = storeData[field.key];
    if (value) {
      switch (field.type) {
        case 'single_line_text_field':
        case 'multi_line_text_field':
          if (typeof value !== 'string') {
            errors.push(`Invalid type for ${field.name}: expected string`);
          }
          break;
        // Add more type validations as needed
      }
    }
  });

  return errors;
};

const createStoreMetaobject = async (admin, storeData, definitionFields) => {
  try {
    // Validate the store data against the definition
    const validationErrors = validateStoreData(storeData, definitionFields);
    if (validationErrors.length > 0) {
      return {
        status: 400,
        error: 'Validation failed',
        details: validationErrors
      };
    }

    // Transform the data into metaobject fields
    const fields = definitionFields.map(field => ({
      key: field.key,
      value: storeData[field.key] || ''
    }));

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
            handle: storeData.store_name?.toLowerCase().replace(/\s+/g, '-') || 
                   `store-${Date.now()}`,
            fields
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

export const processStoreImport = async (admin, storesData) => {
  try {
    // Fetch the metaobject definition first
    const definitionResult = await fetchMetaobjectDefinition(admin);
    if (definitionResult.status !== 200) {
      return {
        status: definitionResult.status,
        error: definitionResult.error,
        details: definitionResult.details
      };
    }

    const definitionFields = definitionResult.definition;
    const results = {
      successful: [],
      failed: [],
      total: storesData.length
    };

    // Process each store
    for (const storeData of storesData) {
      const createResult = await createStoreMetaobject(admin, storeData, definitionFields);
      
      if (createResult.status === 200) {
        results.successful.push({
          storeName: storeData.store_name || 'Unknown',
          handle: createResult.data.handle
        });
      } else {
        results.failed.push({
          storeName: storeData.store_name || 'Unknown',
          error: createResult.error,
          details: createResult.details
        });
      }
    }

    return {
      status: results.failed.length > 0 ? 207 : 200,
      data: {
        message: `Processed ${results.total} stores. ${results.successful.length} succeeded, ${results.failed.length} failed.`,
        successful: results.successful,
        failed: results.failed
      }
    };
  } catch (error) {
    return {
      status: 500,
      error: 'Failed to process store import',
      details: error.message
    };
  }
};

export {fetchStores,checkMetaobjectDefinition,createMetaobjectDefinition,createStoreMetaobject,fetchMetaobjectDefinition,validateStoreData};



  