import { json } from '@remix-run/node';
import { 
  checkMetaobjectDefinition, 
  createMetaobjectDefinition, 
  createStoreMetaobject,
  fetchStores 
} from './metaobject.server';
import { authenticate } from "../../shopify.server";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);
  
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
      throw new Error('Failed to fetch stores');
    }

    const stores = data.data.metaobjects.edges.map(edge => {
      const store = {};
      edge.node.fields.forEach(field => {
        store[field.key] = field.value;
      });
      return store;
    });

    return json({ stores });
  } catch (error) {
    console.error('Error fetching stores:', error);
    return json({ stores: [] });
  }
}

export async function action({ request }) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'check') {
    return await checkMetaobjectDefinition(request);
  }

  if (intent === 'create') {
    return await createMetaobjectDefinition(request);
  }

  if (intent === 'createStore') {
    const storeData = {
      storeName: formData.get('Store Name'),
      address: formData.get('Address'),
      city: formData.get('City'),
      state: formData.get('State'),
      zip: formData.get('ZIP'),
      country: formData.get('Country'),
      phone: formData.get('Phone'),
      email: formData.get('Email'),
      hours: formData.get('Hours'),
      services: formData.get('Services')
    };
    return await createStoreMetaobject(request, storeData);
  }

  return json({ error: 'Invalid intent' }, { status: 400 });
}
