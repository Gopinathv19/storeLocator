export async function executeGraphQL(query, variables = {}, request) {
  const { admin } = await authenticate.admin(request);

  try {
    const response = await admin.graphql(query, variables);
    const result = await response.json();

    if (result.errors) {
      console.log('GraphQL Error:', result.errors);
      throw new Error(result.errors[0].message);
    }

    return result;
  } catch (error) {
    console.error('GraphQL Error:', error);
    throw error;
  }
}