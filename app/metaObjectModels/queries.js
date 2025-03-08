// app/lib/shopify/queries.js
// Central location for all GraphQL queries
export const QUERIES = {
    GET_STORES: `#graphql
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
      }
    `,
    CHECK_METAOBJECT_DEFINITION: `#graphql
      query {
        metaobjectDefinitions(first: 10) {
          edges {
            node {
              type
            }
          }
        }
      }
    `
  };
  
  // Mutations was 
  export const MUTATIONS = {
    CREATE_METAOBJECT_DEFINITION: `#graphql
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
      }
    `,
    CREATE_STORE: `#graphql
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
      }
    `
  };