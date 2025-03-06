import admin from "../shopify.server";

const fetchStoresFromAPI = async () => {
    try {
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
        if (data.errors) {
            console.error('Error fetching store locations:', data.errors);
            throw new Error('Failed to fetch store locations');
        }

        // Map the response to a more usable format
        const stores = data.data.metaobjects.edges.map(edge => {
            const store = {};
            edge.node.fields.forEach(field => {
                store[field.key] = field.value;
            });
            return store;
        });

        return stores;
    } catch (error) {
        console.error('Error in fetchStoresFromAPI:', error);
        throw error;
    }
};

export default fetchStoresFromAPI;