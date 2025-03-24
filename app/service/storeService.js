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

export const createMetaobjectDefinition = async (admin, selectedFields,schemaName='schema_1') => {
  try {
 
    const fieldDefinitions = selectedFields.map(field => ({
      name: field.trim(),
      key: field.trim().toLowerCase().replace(/\s+/g, '_'),
      type: "multi_line_text_field"  
    }));

    console.log("*************** schemaName ******************",schemaName);

    console.log("*************** fieldDefinitions ******************",fieldDefinitions);

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
            name: `${schemaName}`,
            type: `${schemaName.toLowerCase()}`,
            fieldDefinitions,
          }
        }
      }
    );

    const data = await response.json();
    console.log("*************** data ******************",data);
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

const createStoreMetaobject = async (admin, storeData) => {
  try {
    // Transform store data into fields array dynamically
    const fields = Object.entries(storeData).map(([key, value]) => ({
      key: key.toLowerCase().replace(/\s+/g, '_'),
      value: value?.toString() || ''
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
            handle: `store-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fields: fields
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
    console.log("****error in fetching stores **********",data.errors);
    return {status : 500 , error : 'Failed to fetch stores',details : data.errors}
  }

  const stores = data?.data?.metaobjects?.edges?.map(edge =>{
    const store = {};
    edge.node.fields.forEach(field =>{
      store[field.key] = field.value;
    })
    return store;
  });
  console.log("*************** stores ******************",stores);
  return {status : 200,stores};

}

export const fetchMetaobjectDefinitionDetails = async (admin) => {
  try {
    const response = await admin.graphql(
      `#graphql
      query {
        metaobjectDefinitionByType(type: "store_location") {
          id
          name
          type
          fieldDefinitions {
            name
            key
          }
        }
      }`
    );
    
    const data = await response.json();
    
    if (data.errors) {
      console.error('Error fetching metaobject definition:', data.errors);
      return { 
        status: 500, 
        error: 'Failed to fetch metaobject definition details', 
        details: data.errors 
      };
    }
    
    const definition = data?.data?.metaobjectDefinitionByType;
    
    if (!definition) {
      return { status: 404, exists: false };
    }
    
    // Extract field definitions matching the exact structure returned by the API
    const fieldDefinitions = definition.fieldDefinitions.map(field => ({
      name: field.name,
      key: field.key
      // Note: 'type' is not included in the response, so we don't include it here
    }));
    
    return { 
      status: 200, 
      exists: true, 
      definitionId: definition.id,
      name: definition.name,
      type: definition.type,
      fieldDefinitions 
    };
  } catch (error) {
    console.error('Error in fetchMetaobjectDefinitionDetails:', error.message);
    return { 
      status: 500, 
      error: 'Failed to fetch metaobject definition details', 
      details: error.message 
    };
  }
};

export const updateMetaobjectDefinition = async (admin, definitionId, newFields) => {
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

export const fetchSchemas = async (admin) => {
  try{
    const response = await admin.graphql(
       ` #graphql
       query{
       metaobjectDefinitions(first : 50){
       edges{
       node{
       type
       }}}}
      `
    );
    const data = await response.json();
    if(data.errors){
      return {
        status : 500,
        error : 'Failed to fetch schemas',
        schemas : []
      };
    }
    const schemas = data?.data?.metaobjectDefinitions?.edges?.map(edge => edge.node.type)
    .filter(type.startsWith('schema_'));
    return {
      status : 200,
      schemas
    }
  }
  catch(error){
    return {
      status : 500,
      error : 'Failed to fetch schemas',
      schemas : []
    };
  }
}

export {fetchStores,checkMetaobjectDefinition,createMetaobjectDefinition,createStoreMetaobject};



  