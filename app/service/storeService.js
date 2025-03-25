import { json } from '@remix-run/node';
 

export const checkMetaobjectDefinition = async (admin) => {
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

export const createStoreMetaobject = async (admin, storeData) => {
  try {

    const schemaType = storeData.schema_reference;
    if(!schemaType){
      return {
        status: 500,
        error: 'Schema type is required',
        details: 'Schema type is required'
      };
    }

    const {schema_reference, ...fieldData} = storeData;

    // Transform store data into fields array dynamically
    const fields = Object.entries(fieldData).map(([key, value]) => ({
      key: key.toLowerCase().replace(/\s+/g, '_'),
      value: value?.toString() || ''
    }));
  
    console.log("Creating metaobject with schema:", schemaType); // Debug log
    console.log("Fields:", fields);

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
            type: schemaType,
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
 

export const fetchStores = async (admin, schemaType) => {
    try {
        if(!schemaType){
            return {
                status: 400,
                error: 'Schema type is required',
                details: 'Schema type is required'
            };
        }
        console.log("Fetching stores for schema type:", schemaType); // Debug log
        
        const response = await admin.graphql(
            `#graphql
            query($type: String!) {
                metaobjects(type: $type, first: 50) {
                    edges {
                        node {
                            id
                            handle
                            type
                            fields {
                                key
                                value
                            }
                        }
                    }
                }
            }`,
            {
                variables: {
                    type: schemaType
                }
            }
        );

        const data = await response.json();

        if (data.errors) {
            console.error("GraphQL Errors:", data.errors); // Debug log
            return { 
                status: 500, 
                error: 'Failed to fetch stores', 
                details: data.errors 
            };
        }

        const stores = data?.data?.metaobjects?.edges?.map(edge => {
            const store = {
                id: edge.node.id,
                handle: edge.node.handle
            };
            edge.node.fields.forEach(field => {
                store[field.key] = field.value;
            });
            return store;
        }) || [];

        console.log("Fetched stores:", stores); // Debug log

        return { 
            status: 200, 
            stores 
        };

    } catch (error) {
        console.error("Fetch Stores Error:", error); // Debug log
        return { 
            status: 500, 
            error: 'Failed to fetch stores', 
            details: error.message 
        };
    }
};

export const fetchSchemas = async (admin) => {
  try {
    const response = await admin.graphql(
      `#graphql
      query {
        metaobjectDefinitions(first: 50) {
          edges {
            node {
              type
              name
              fieldDefinitions {
                name
                key
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
        error: 'Failed to fetch schemas',
        schemas: []
      };
    }

    // Filter schemas that start with 'schema_' and sort them
    const schemas = data?.data?.metaobjectDefinitions?.edges
      ?.map(edge => edge.node)
      ?.filter(node => node.type.startsWith('schema_'))
      ?.sort((a, b) => {
        const numA = parseInt(a.type.split('_')[1]);
        const numB = parseInt(b.type.split('_')[1]);
        return numA - numB;
      });

    return {
      status: 200,
      schemas: schemas || []
    };
  }
  catch (error) {
    return {
      status: 500,
      error: 'Failed to fetch schemas',
      schemas: []
    };
  }
}

  