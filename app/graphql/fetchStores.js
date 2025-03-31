import { json } from '@remix-run/node';
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
