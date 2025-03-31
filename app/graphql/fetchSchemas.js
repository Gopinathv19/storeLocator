import { json } from '@remix-run/node';
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