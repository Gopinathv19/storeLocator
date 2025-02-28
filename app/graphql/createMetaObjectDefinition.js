import { authenticate } from "../shopify.server";

const CREATE_METAOBJECT_DEFINITION = `
  mutation CreateMetaobjectDefinition {
    metaobjectDefinitionCreate(
      definition: {
        name: "Store Location"
        type: "store_location"
        fieldDefinitions: [
          {
            name: "Store Name"
            key: "store_name"
            type: "single_line_text_field"
            required: true
          },
          {
            name: "Address"
            key: "address"
            type: "single_line_text_field"
            required: true
          },
          {
            name: "City"
            key: "city"
            type: "single_line_text_field"
            required: true
          },
          {
            name: "State"
            key: "state"
            type: "single_line_text_field"
            required: true
          },
          {
            name: "ZIP"
            key: "zip"
            type: "single_line_text_field"
            required: true
          },
          {
            name: "Country"
            key: "country"
            type: "single_line_text_field"
            required: true
          },
          {
            name: "Phone"
            key: "phone"
            type: "single_line_text_field"
            required: true
          },
          {
            name: "Email"
            key: "email"
            type: "single_line_text_field"
            required: true
          },
          {
            name: "Hours"
            key: "hours"
            type: "multi_line_text_field"
            required: true
          },
          {
            name: "Services"
            key: "services"
            type: "multi_line_text_field"
            required: false
          }
        ]
      }
    ) {
      metaobjectDefinition {
        id
        type
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export async function createStoreLocationDefinition(request) {
  const { admin } = await authenticate.admin(request);

  try {
    const response = await admin.graphql(CREATE_METAOBJECT_DEFINITION);
    const { data, errors } = await response.json();

    if (errors) {
      throw new Error(errors[0].message);
    }

    if (data.metaobjectDefinitionCreate.userErrors.length > 0) {
      throw new Error(data.metaobjectDefinitionCreate.userErrors[0].message);
    }

    return data.metaobjectDefinitionCreate.metaobjectDefinition;
  } catch (error) {
    console.error('Error creating metaobject definition:', error);
    throw error;
  }
}