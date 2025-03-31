import { json } from '@remix-run/node';

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