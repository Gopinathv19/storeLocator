const checkMetaobjectDefinition = async () =>{
    try{
    const response = await admin.graphql(
        `#graphql
        query{
        metaobjectDefinitions(first:10){
        edges{
        node{
        type
        }
        }
        }
        }`
    );

    const data = await response.json();
    if(data.errors){
        console.error('Error fetching metaobject definitions:',data.errors);
        return false;
    }
    const definition = data.data.metaobjectDefinitions.edges.map(edge => edge.node.type);
    return definition.includes("store_location");
}
catch(error){
    console.error('Error fetching metaobject definitions:',error);
}
};

const setupMetaObjectDefinition = async () => {
    try {
        const response = await fetch('/api/createMetaobjectDefinition', {
            method: 'POST',
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Failed to create metaobject definition');
        }
        console.log('Metaobject definition created successfully:', data.result);
    } catch (error) {
        console.error('Error setting up metaobject definition:', error);
        throw error;
    }
};

export default setupMetaObjectDefinition;

