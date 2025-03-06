import admin from "../../shopify.server";

const createMetaobjectDefinition = async () => {
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
                "definition": {
                    "name": "Store Location",
                    "type": "store_location",
                    "fieldDefinitions": [
                        { "name": "Store Name", "key": "store_name", "type": "single_line_text_field" },
                        { "name": "Address", "key": "address", "type": "multi_line_text_field" },
                        { "name": "City", "key": "city", "type": "single_line_text_field" },
                        { "name": "State", "key": "state", "type": "single_line_text_field" },
                        { "name": "ZIP", "key": "zip", "type": "single_line_text_field" },
                        { "name": "Country", "key": "country", "type": "single_line_text_field" },
                        { "name": "Phone", "key": "phone", "type": "single_line_text_field" },
                        { "name": "Email", "key": "email", "type": "single_line_text_field" },
                        { "name": "Hours", "key": "hours", "type": "multi_line_text_field" },
                        { "name": "Services", "key": "services", "type": "multi_line_text_field" }
                    ]
                }
            }
        }
    );

    const data = await response.json();
    if (data.errors) {
        console.error('Error creating metaobject definition:', data.errors);
        throw new Error('Failed to create metaobject definition');
    }
    console.log('Metaobject definition created successfully');
    return data.data.metaobjectDefinitionCreate.metaobjectDefinition;
};

export default createMetaobjectDefinition;