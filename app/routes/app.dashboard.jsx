import { useState, useCallback, useEffect } from 'react';
import { 
    Page, 
    Card, 
    Text, 
    ButtonGroup, 
    Button,
    Box, 
    InlineStack, 
    BlockStack,
    DropZone,
    Form,
    FormLayout,
    TextField,
    Checkbox
} from '@shopify/polaris';
import { 
    StoreIcon, 
    ImportIcon, 
    ColorIcon, 
    SearchIcon, 
    SettingsIcon 
} from '@shopify/polaris-icons';
import { useSubmit, useLoaderData } from '@remix-run/react';
import csvReader from '../helper/csvReader';
import { json } from '@remix-run/node';
import { createMetaobjectDefinition } from '../graphql/createMetaObjectDefinition';
import { createStoreMetaobject } from '../graphql/createStoreMetaobject';
import { fetchSchemas } from '../graphql/fetchSchemas';
import { fetchStores } from '../graphql/fetchStores';
import { authenticate } from '../shopify.server';

const generateStoreLocationsHtml = (stores) => {
    if (!stores || stores.length === 0) {
        return `
            <div class="store-container">
                <h1>Store Locations</h1>
                <p class="no-stores">No store locations available.</p>
            </div>
        `;
    }

    // Filter out system fields from display
    const getDisplayFields = (store) => {
        return Object.entries(store).filter(([key]) => 
            !['id', 'handle'].includes(key.toLowerCase()) && 
            store[key] !== null && 
            store[key] !== undefined
        );
    };

    // Format field name for display (convert snake_case to Title Case)
    const formatFieldName = (key) => {
        return key
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Get store name (first field with "name" in it, or first non-null field)
    const getStoreName = (store) => {
        const fields = getDisplayFields(store);
        const nameField = fields.find(([key]) => key.includes('name'));
        return nameField ? nameField[1] : (fields.length > 0 ? fields[0][1] : 'Unnamed Store');
    };

    // Get address fields
    const getAddressFields = (store) => {
        const addressKeys = ['address', 'street_address', 'street', 'city', 'city_name', 
                            'state', 'state_code', 'province', 'zip', 'postal_code', 'country', 'country_name'];
        
        return getDisplayFields(store)
            .filter(([key]) => addressKeys.some(addr => key.includes(addr)))
            .map(([key, value]) => ({ key: formatFieldName(key), value }));
    };

    // Get contact fields
    const getContactFields = (store) => {
        const contactKeys = ['phone', 'email', 'hours', 'business_hours', 'services', 'available_services'];
        
        return getDisplayFields(store)
            .filter(([key]) => contactKeys.some(contact => key.includes(contact)))
            .map(([key, value]) => ({ key: formatFieldName(key), value }));
    };

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Store Locations</title>
        <style>
            :root {
                --primary-color: #5c6ac4;
                --primary-light: #f5f6fa;
                --text-color: #212b36;
                --text-light: #637381;
                --border-color: #dfe3e8;
                --background-light: #f9fafb;
                --shadow: 0 2px 5px rgba(0,0,0,0.05);
                --radius: 8px;
            }
            
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                line-height: 1.6;
                color: var(--text-color);
                background-color: var(--background-light);
                padding: 20px;
            }
            
            .store-container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px 0;
            }
            
            .store-container h1 {
                color: var(--text-color);
                margin-bottom: 30px;
                text-align: center;
                font-size: 2.5rem;
                font-weight: 600;
            }
            
            .no-stores {
                text-align: center;
                font-size: 1.2rem;
                color: var(--text-light);
            }
            
            .store-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 25px;
            }
            
            .store-card {
                background: white;
                border-radius: var(--radius);
                overflow: hidden;
                box-shadow: var(--shadow);
                transition: transform 0.2s, box-shadow 0.2s;
                position: relative;
            }
            
            .store-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 8px 15px rgba(0,0,0,0.1);
            }
            
            .store-header {
                padding: 15px 20px;
                background: var(--primary-color);
                color: white;
            }
            
            .store-header h2 {
                font-size: 1.3rem;
                font-weight: 600;
                margin: 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .store-body {
                padding: 20px;
            }
            
            .store-section {
                margin-bottom: 15px;
            }
            
            .store-section h3 {
                font-size: 1rem;
                font-weight: 600;
                margin-bottom: 8px;
                color: var(--primary-color);
                border-bottom: 1px solid var(--border-color);
                padding-bottom: 5px;
            }
            
            .store-detail {
                margin-bottom: 8px;
            }
            
            .store-detail-label {
                font-weight: 500;
                color: var(--text-light);
                font-size: 0.9rem;
            }
            
            .store-detail-value {
                font-size: 0.95rem;
            }
            
            .store-footer {
                padding: 15px 20px;
                border-top: 1px solid var(--border-color);
                display: flex;
                justify-content: flex-end;
            }
            
            .view-button {
                display: inline-block;
                padding: 8px 16px;
                background-color: var(--primary-color);
                color: white;
                border-radius: 4px;
                text-decoration: none;
                font-size: 0.9rem;
                font-weight: 500;
                cursor: pointer;
                transition: background-color 0.2s;
                border: none;
                outline: none;
            }
            
            .view-button:hover {
                background-color: #4959bd;
            }
            
            /* Store details modal */
            .modal {
                display: none;
                position: fixed;
                z-index: 999;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0,0,0,0.5);
            }
            
            .modal-content {
                background-color: white;
                margin: 5% auto;
                padding: 25px;
                border-radius: var(--radius);
                width: 90%;
                max-width: 700px;
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
            }
            
            .close-modal {
                position: absolute;
                top: 15px;
                right: 20px;
                font-size: 1.5rem;
                cursor: pointer;
                color: var(--text-light);
            }
            
            .close-modal:hover {
                color: var(--text-color);
            }
            
            .modal-header {
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid var(--border-color);
            }
            
            .modal-header h2 {
                font-size: 1.8rem;
                color: var(--primary-color);
                margin: 0;
            }
            
            .modal-body {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
            }
            
            @media (max-width: 768px) {
                .modal-body {
                    grid-template-columns: 1fr;
                }
                
                .store-grid {
                    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                }
            }
            
            @media (max-width: 480px) {
                .store-container {
                    padding: 15px 0;
                }
                
                .store-container h1 {
                    font-size: 2rem;
                }
                
                .modal-content {
                    margin: 0;
                    width: 100%;
                    height: 100%;
                    max-height: 100vh;
                    border-radius: 0;
                }
            }
        </style>
    </head>
    <body>
        <div class="store-container">
            <h1>Store Locations</h1>
            <div class="store-grid">
                ${stores.map(store => {
                    const storeName = getStoreName(store);
                    const addressFields = getAddressFields(store);
                    const contactFields = getContactFields(store);
                    const storeId = store.id || '';
                    const storeHandle = store.handle || '';
                    
                    return `
                        <div class="store-card" data-id="${storeId}" data-handle="${storeHandle}">
                            <div class="store-header">
                                <h2>${storeName}</h2>
                            </div>
                            <div class="store-body">
                                ${addressFields.length > 0 ? `
                                <div class="store-section">
                                    <h3>Address</h3>
                                    ${addressFields.slice(0, 3).map(({ key, value }) => `
                                        <div class="store-detail">
                                            <div class="store-detail-label">${key}</div>
                                            <div class="store-detail-value">${value}</div>
                                        </div>
                                    `).join('')}
                                    ${addressFields.length > 3 ? `<div class="store-detail-more">+${addressFields.length - 3} more...</div>` : ''}
                                </div>
                                ` : ''}
                                
                                ${contactFields.length > 0 ? `
                                <div class="store-section">
                                    <h3>Contact</h3>
                                    ${contactFields.slice(0, 2).map(({ key, value }) => `
                                        <div class="store-detail">
                                            <div class="store-detail-label">${key}</div>
                                            <div class="store-detail-value">${value}</div>
                                        </div>
                                    `).join('')}
                                    ${contactFields.length > 2 ? `<div class="store-detail-more">+${contactFields.length - 2} more...</div>` : ''}
                                </div>
                                ` : ''}
                            </div>
                            <div class="store-footer">
                                <button class="view-button" onclick="showStoreDetails('${storeId}')">View Details</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
        
        <!-- Store Details Modal -->
        <div id="storeModal" class="modal">
            <div class="modal-content">
                <span class="close-modal" onclick="closeModal()">&times;</span>
                <div class="modal-header">
                    <h2 id="modalStoreName"></h2>
                </div>
                <div class="modal-body" id="modalStoreDetails">
                    <!-- Details will be populated by JavaScript -->
                </div>
            </div>
        </div>
        
        <script>
            // Store data for the modal
            const storeData = ${JSON.stringify(stores.map(store => {
                const fields = getDisplayFields(store);
                return {
                    id: store.id || '',
                    name: getStoreName(store),
                    fields: fields.map(([key, value]) => ({ 
                        key: formatFieldName(key), 
                        value: value 
                    }))
                };
            }))};
            
            function showStoreDetails(storeId) {
                const store = storeData.find(s => s.id === storeId);
                if (!store) return;
                
                const modal = document.getElementById('storeModal');
                const modalName = document.getElementById('modalStoreName');
                const modalDetails = document.getElementById('modalStoreDetails');
                
                // Set store name
                modalName.textContent = store.name;
                
                // Clear previous details
                modalDetails.innerHTML = '';
                
                // Add all fields to modal
                let html = '';
                store.fields.forEach(({ key, value }) => {
                    html += '<div class="store-detail">' +
                        '<div class="store-detail-label">' + key + '</div>' +
                        '<div class="store-detail-value">' + value + '</div>' +
                        '</div>';
                });
                
                modalDetails.innerHTML = html;
                
                // Show modal
                modal.style.display = 'block';
                
                // Close modal when clicking outside
                window.onclick = function(event) {
                    if (event.target === modal) {
                        closeModal();
                    }
                };
            }
            
            function closeModal() {
                document.getElementById('storeModal').style.display = 'none';
            }
        </script>
    </body>
    </html>
    `;

    return htmlContent;
};

const updateStoreLocationsPage = async (admin, stores) => {
    try {
        if (!stores || stores.length === 0) {
            return false;
        }

        // Generate HTML content for the page
        const pageContent = generateStoreLocationsHtml(stores);

        // Check if the page exists - using the correct query structure
        const pagesQuery = `
            {
                pages(first: 10) {
                    edges {
                        node {
                            id
                            title
                            handle
                            body
                            createdAt
                            updatedAt
                        }
                    }
                }
            }
        `;

        // Execute the query to find existing page
        const pagesResponse = await admin.graphql(pagesQuery);
        const pagesData = await pagesResponse.json();
        console.log('Pages query response:', pagesData);

        // Find the Store Locations page
        const existingPage = pagesData.data.pages.edges.find(
            edge => edge.node.title === "Store Locations"
        )?.node;

        if (existingPage) {
            // Update existing page
            const updateMutation = `
                mutation UpdatePage($id: ID!, $page: PageUpdateInput!) {
                    pageUpdate(id: $id, page: $page) {
                        page {
                            id
                            title
                            handle
                            body
                        }
                        userErrors {
                            code
                            field
                            message
                        }
                    }
                }
            `;

            const updateResponse = await admin.graphql(updateMutation, {
                variables: {
                    id: existingPage.id,
                    page: {
                        title: "Store Locations",
                        handle: "store-locations",
                        body: pageContent
                    }
                }
            });

            const updateResult = await updateResponse.json();
            console.log('Update response:', updateResult);

            if (updateResult.data?.pageUpdate?.userErrors?.length > 0) {
                throw new Error(updateResult.data.pageUpdate.userErrors[0].message);
            }
        } else {
            // Create new page
            const createMutation = `
                mutation CreatePage($page: PageCreateInput!) {
                    pageCreate(page: $page) {
                        page {
                            id
                            title
                            handle
                            body
                            isPublished
                        }
                        userErrors {
                            code
                            field
                            message
                        }
                    }
                }
            `;

            const createResponse = await admin.graphql(createMutation, {
                variables: {
                    page: {
                        title: "Store Locations",
                        handle: "store-locations",
                        body: pageContent,
                        isPublished: true
                    }
                }
            });
            const createResult = await createResponse.json();
            console.log('Create response:', createResult);

            if (createResult.data?.pageCreate?.userErrors?.length > 0) {
                throw new Error(createResult.data.pageCreate.userErrors[0].message);
            }
        }

        return true;
    } catch (error) {
        console.error('Error updating store locations page:', error);
        console.error('Full error:', JSON.stringify(error, null, 2));
        return false;
    }
};

export const loader = async ({ request }) => {
    try {
        const { admin } = await authenticate.admin(request);
        if(!admin){
            return json({ error: 'Unauthorized' }, { status: 401 });
        }           
        // Fetch metaobject definition details
        const schemaResult = await fetchSchemas(admin);
        const schemas =  schemaResult.schemas;
        const latestSchema = schemas.length > 0 ? schemas[schemas.length-1] : null;
        console.log("*************** latestSchema ******************", latestSchema);
        // Fetch stores if definition exists
        let stores = [];
        let error = null;
        let fieldDefinitions =[];
        
        // definition exists status

        const definitionExists = !!latestSchema;
        if (latestSchema) {
            try{
                fieldDefinitions = latestSchema.fieldDefinitions || [];
                console.log("*************** fieldDefinitions ******************", fieldDefinitions);

                const schemaType = latestSchema.type.toLowerCase();
                console.log("*************** schemaType ******************", schemaType);
    
                const storesResult = await fetchStores(admin,schemaType);
                console.log("*************** storesResult ****************** \n", storesResult);
    
                if (storesResult.status === 200) {
                    stores = storesResult.stores;
                    
                    // Add this block: Update/Create store locations page when stores exist
                    if (stores && stores.length > 0) {
                        const pageUpdateSuccess = await updateStoreLocationsPage(admin, stores);
                        if (!pageUpdateSuccess) {
                            console.error('Failed to update store locations page during load');
                        }
                    }
                } else {
                    error = storesResult.error;
                }
            } catch (error){
                console.log("*************** error ******************", error);
            }   
 
 
        }
        else{
            console.log("*************** no schema found ******************");
        }

        const response = {
            stores: stores || [],
            schemas: schemas || [],
            latestSchema: latestSchema || null,
            fieldDefinitions: fieldDefinitions || [],
            definitionExists: definitionExists || false,
            error: error || null
        };

        console.log("*************** response ******************", response);
        return json(response);
    } catch (error) {
        console.log(error);
        return json({ error: 'Failed to load stores' }, { status: 500 });
    }
};

export const action = async ({ request }) => {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const intent = formData.get('intent');

    if (intent === 'processFile') {
        try {
            // Parse incoming data
            const storesData = JSON.parse(formData.get('stores'));
            const selectedFields = JSON.parse(formData.get('selectedFields'));
            const existingFields = JSON.parse(formData.get('existingFields'));
            const schemas = JSON.parse(formData.get('schemas') || '[]');

            // Validate store data
            if (!Array.isArray(storesData) || storesData.length === 0) {
                return json({ 
                    success: false,
                    message: 'No valid store data provided', 
                    status: '400'
                });
            }

            // Determine if we have new fields
            const newFields = selectedFields.filter(field => !existingFields.includes(field));
            const hasNewFields = newFields.length > 0;

            // Initialize schema name
            let currentSchema = 'schema_1';
            
            // Check if metaobject definition exists and if we need to create a new one
            const schemaExists = schemas.length > 0;
            
            if (!schemaExists || hasNewFields) {
                if (schemaExists) {
                    const latestSchema = schemas[schemas.length - 1];
                    const latestNumber = parseInt(latestSchema.type.split('_')[1]);
                    currentSchema = `schema_${latestNumber + 1}`;
                } else {
                    // First time upload - use schema_1
                    currentSchema = 'schema_1';
                }

                console.log("*************** currentSchema ******************", currentSchema);
                console.log("*************** selected fields ******************", selectedFields);

                // Create new metaobject definition
                const createDefinitionResult = await createMetaobjectDefinition(
                    admin, 
                    selectedFields, 
                    currentSchema
                );

                if (createDefinitionResult.status !== 200) {
                    return json({ 
                        success: false,
                        message: 'Failed to create metaobject definition',
                        details: createDefinitionResult.error
                    }, { status: 500 });
                }
            }

            // Create store metaobjects
            const results = [];
            for (const row of storesData) {
                // Prepare store data with selected fields
                const storeData = {};
                selectedFields.forEach(field => {
                    storeData[field] = row[field] || '';
                });
                
                // Add schema reference
                storeData.schema_reference = currentSchema;
                
                console.log("*************** storeData ******************", storeData);

                try {
                    // Create metaobject for store
                    const createResult = await createStoreMetaobject(admin, storeData);
                    results.push({
                        storeName: storeData[selectedFields[0]] || 'Unknown',
                        success: createResult.status === 200,
                        error: createResult.status !== 200 ? createResult.error : null
                    });
                } catch (err) {
                    results.push({
                        storeName: storeData[selectedFields[0]] || 'Unknown',
                        success: false,
                        error: err.message
                    });
                }
            }

            // Handle failed stores
            const failedStores = results.filter(r => !r.success);
            if (failedStores.length > 0) {
                return json({
                    success: false,
                    message: `Imported ${results.length - failedStores.length} stores. ${failedStores.length} failed.`,
                    failedStores
                }, { status: 207 });
            }

            // Fetch all stores after successful import
            const storesResult = await fetchStores(admin, currentSchema.toLowerCase());
            if (storesResult.status === 200) {
                // Update the store locations page with new data
                const pageUpdateSuccess = await updateStoreLocationsPage(admin, storesResult.stores);
                
                if (!pageUpdateSuccess) {
                    console.error('Failed to update store locations page');
                }
            }

            // Return success response
            return json({ 
                success: true,
                message: `Successfully imported ${results.length} stores.`,
                schema: currentSchema
            }, { status: 200 });

        } catch (error) {
            return json({ 
                success: false,
                message: error.message || 'An unexpected error occurred' 
            }, { status: 500 });
        }
    }

    return json({ 
        success: false,
        message: 'Invalid request' 
    }, { status: 400 });
};

// Dashboard component
export default function Dashboard() {
    const [selected, setSelected] = useState('Stores');
    const [openFileDialog, setOpenFileDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isAddingStore, setIsAddingStore] = useState(false);
    const [csvHeaders,setCsvHeaders] = useState([]);
    const [selectedFields,setSelectedFields] = useState([]);
    const [parsedData,setParsedData] = useState(null);
    const [showFieldSelection,setShowFieldSelection] = useState(false);
    const [existingFields, setExistingFields] = useState([]);
    const [newFields, setNewFields] = useState([]);
    const [showFieldConfirmation, setShowFieldConfirmation] = useState(false);
    const submit = useSubmit();
    const { schemas,stores, definitionExists, fieldDefinitions ,latestSchema} = useLoaderData();
    console.log(stores)
    const [isLoadingStores, setIsLoadingStores] = useState(true);
    const [formValues, setFormValues] = useState({});

    // this guy is fethcing the metaobject definition details
    useEffect(() => {
        if (definitionExists && fieldDefinitions.length > 0) {
            setExistingFields(fieldDefinitions.map(field => field.name));
            console.log("*************** existingFields ******************",existingFields);
        }
        return () => {
            setExistingFields([]);
            setSelectedFields([]);
        };
    }, [definitionExists, fieldDefinitions]);

    useEffect(() => {
        if (stores) {
            setIsLoadingStores(false);
        }
    }, [stores]);

    const handleInputChange = (value, fieldName) => {
        setFormValues(prev => ({
            ...prev,
            [fieldName]: value
        }));
    };

    const handleManualSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Format the store data similar to CSV upload format
            const storeData = [{  // Wrap in array as CSV handles multiple stores
                ...formValues,
                schema_reference: latestSchema?.type || 'schema_1' // Add schema reference like CSV upload
            }];

            const formData = new FormData();
            formData.append('intent', 'processFile');  // Use same intent as CSV
            formData.append('selectedFields', JSON.stringify(Object.keys(formValues)));
            formData.append('existingFields', JSON.stringify(fieldDefinitions.map(f => f.name)));
            formData.append('stores', JSON.stringify(storeData));
            formData.append('schemas', JSON.stringify(schemas || []));
            formData.append('latestSchema', JSON.stringify(latestSchema || null));

            await submit(formData, {
                method: 'post',
                replace: true
            });

            setIsAddingStore(false);
            setFormValues({}); // Reset form after successful submission
        } catch (err) {
            setError(err.message || 'Failed to add store');
        } finally {
            setLoading(false);
        }
    };

    const handleAddStoreClick = () => {
        setIsAddingStore(!isAddingStore);
    };

    const handleCancelAdd = () => {
        setIsAddingStore(false);
        setFormValues({});
    };

    const handleButtonClick = useCallback((value) => {
        setSelected(value);
    }, []);

    const handleDropZoneDrop = useCallback(async (dropFiles) => {
        if (!dropFiles.length) return;
        if(!dropFiles[0].name.toLowerCase().endsWith('.csv')){
            setError('No file selected');
            return;
        }
        try {
            setLoading(true);
            setError(null);

            const file = dropFiles[0];
            const parsedData = await csvReader(file);

            if (!Array.isArray(parsedData) || parsedData.length === 0) {
                throw new Error('No valid data found in CSV');
            }

            // Get headers from the first row
            const headers = Object.keys(parsedData[0]);
            setCsvHeaders(headers);
            setParsedData(parsedData);
            
            if (definitionExists) {
                // Identify existing and new fields
                const existingFieldsSet = new Set(existingFields);
                const newFields = headers.filter(header => !existingFieldsSet.has(header));
                const existingFieldsInUpload = headers.filter(header => existingFieldsSet.has(header));

                // Set state for existing and new fields
                setExistingFields(existingFieldsInUpload);
                setNewFields(newFields);
                setShowFieldConfirmation(true);
            } else {
                // First time upload, show all fields for selection
                setShowFieldSelection(true);
            }
        } catch (err) {
            setError(err.message || 'Failed to process file');
        } finally {
            setLoading(false);
        }
    }, [definitionExists, existingFields]);

    const toggleOpenFileDialog = useCallback(
        () => setOpenFileDialog((openFileDialog) => !openFileDialog),
        [],
    );

    const handleFieldSelection = (header, checked) => {
        if(!header){
            setError('No header selected');
            return;
        }
        setSelectedFields(prev => 
            checked ? [...new Set([...prev, header])] : prev.filter(field => field !== header)
        );
    };

    const handleFieldConfirmation = (confirmed) => {
        if (confirmed) {
            // User wants to include new fields
            const selectedNewFields = newFields.filter(field => selectedFields.includes(field));
            setSelectedFields([...existingFields.filter(field => csvHeaders.includes(field)), ...selectedNewFields]);
        } else {
            // User only wants to use existing fields
            setSelectedFields(existingFields.filter(field => csvHeaders.includes(field)));
        }
        
        setShowFieldConfirmation(false);
        setShowFieldSelection(true);
    };

    const handleProcessSelectedFields = async () => {
        try {
            setLoading(true);
            setError(null);
            if(!parsedData || parsedData.length === 0){
                setError('No data found in CSV');
                setLoading(false);
                return;
            }
            if(!selectedFields || selectedFields.length === 0){
                setError('No fields selected');
                setLoading(false);
                return;
            }
            
            const filteredData = parsedData.map(row => {
                const filteredRow = {};
                selectedFields.forEach(field => {
                    filteredRow[field] = row[field] || '';
                });
                return filteredRow;
            });

            const formData = new FormData();
            formData.append('intent', 'processFile');
            formData.append('selectedFields', JSON.stringify(selectedFields));
            formData.append('existingFields',JSON.stringify(existingFields));
            formData.append('stores', JSON.stringify(filteredData));
            formData.append('schemas',JSON.stringify(schemas || []));
            formData.append('latestSchema',JSON.stringify(latestSchema || null));
                await submit(formData, {
                method: 'post',
                replace: true
            });

            setShowFieldSelection(false);
            setParsedData(null);
            setCsvHeaders([]);
            setSelectedFields([]);
            setNewFields([]);

            // Switch to Stores tab after successful import
            setSelected('Stores');
        } catch (err) {
            setError(err.message || 'Failed to process fields');
        } finally {
            setLoading(false);
        }
    };

    const buttons = [
        { name: 'Stores', icon: StoreIcon },
        { name: 'Import', icon: ImportIcon },
        { name: 'Appearance', icon: ColorIcon },
        { name: 'SEO', icon: SearchIcon },
        { name: 'Settings', icon: SettingsIcon },
    ];

    return (
        <Page
            title="Store Locator"
            subtitle="Manage your store locations and customize your store locator page"
        >
        {/* this is the button for the all the tabs */}
            <Card>
                <ButtonGroup segmented>
                    {buttons.map((button) => (
                        <Button
                            key={button.name}
                            pressed={selected === button.name}
                            variant={selected === button.name ? 'primary' : 'secondary'}
                            onClick={() => handleButtonClick(button.name)}
                            icon={button.icon}
                        >
                            {button.name}
                        </Button>
                    ))}
                </ButtonGroup>
            </Card>
            {/* this is the card for the stores tab */}
            {selected === 'Stores' && (
                <Card>
                    <InlineStack align="space-between">
                        <Text variant='heading2xl' as='h6'>Store Locations</Text>
                        <Button 
                            onClick={handleAddStoreClick}
                            primary
                        >
                            {isAddingStore ? 'Cancel' : 'Add Store'}
                        </Button>
                    </InlineStack>

                    {isAddingStore && (
                        <Card sectioned>
                            <Form onSubmit={handleManualSubmit}>
                                <FormLayout>
                                    {/* First field gets full width */}
                                    {fieldDefinitions[0] && (
                                        <Box padding="400">
                                            <TextField
                                                label={fieldDefinitions[0].name}
                                                name={fieldDefinitions[0].name}
                                                value={formValues[fieldDefinitions[0].name] || ''}
                                                onChange={(value) => handleInputChange(value, fieldDefinitions[0].name)}
                                                required
                                            />
                                        </Box>
                                    )}
                                    
                                    {/* Remaining fields in groups of 3 */}
                                    {fieldDefinitions.length > 1 && (
                                        <>
                                            {Array.from({ 
                                                length: Math.ceil((fieldDefinitions.length - 1) / 3) 
                                            }).map((_, rowIndex) => {
                                                const startIndex = (rowIndex * 3) + 1;
                                                const rowFields = fieldDefinitions.slice(
                                                    startIndex, 
                                                    startIndex + 3
                                                );
                                                
                                                return (
                                                    <InlineStack gap="400" key={rowIndex}>
                                                        {rowFields.map((field) => (
                                                            <Box 
                                                                key={field.name} 
                                                                width={`${100 / rowFields.length}%`}
                                                                padding="400"
                                                            >
                                                                <TextField
                                                                    label={field.name}
                                                                    name={field.name}
                                                                    value={formValues[field.name] || ''}
                                                                    onChange={(value) => handleInputChange(value, field.name)}
                                                                    required
                                                                />
                                                            </Box>
                                                        ))}
                                                    </InlineStack>
                                                );
                                            })}
                                        </>
                                    )}
                                    
                                    <Box padding="400">
                                        <InlineStack gap="400">
                                            <Button 
                                                submit 
                                                loading={loading} 
                                                primary
                                            >
                                                Create Store
                                            </Button>
                                            <Button 
                                                onClick={handleCancelAdd}
                                                destructive
                                            >
                                                Cancel
                                            </Button>
                                        </InlineStack>
                                    </Box>
                                </FormLayout>
                            </Form>
                        </Card>
                    )}
                    {isLoadingStores ? (
                        <Box padding="400" textAlign="center">
                            <Text>Loading stores...</Text>
                        </Box>
                    ) : !stores || stores.length === 0 ? (
                        <Box padding="400" textAlign="center">
                            <Text>No stores found. Add your first store location.</Text>
                        </Box>
                    ) : (
                        <Box padding="400">
                            {stores.map((store, index) => {
                                // Get all available fields from the store object, excluding id and handle
                                const storeFields = Object.entries(store)
                                    .filter(([key]) => !['id', 'handle'].includes(key) && store[key] !== null);
                                
                                // Get the display name (first available non-null field that contains "name" or "store")
                                const displayNameEntry = storeFields.find(([key, value]) => 
                                    (key.includes('name') || key.includes('store')) && value !== null
                                ) || storeFields[0] || ['', 'Unnamed Store'];
                                
                                return (
                                    <Card key={store.id} sectioned>
                                        <BlockStack gap="400">
                                            {/* Store name - full width */}
                                            <Text variant="headingLg" as="h6">
                                                {displayNameEntry[1] || 'Unnamed Store'}
                                            </Text>

                                            {/* Grid layout for other fields */}
                                            <BlockStack gap="400">
                                                {/* Create rows with 3 fields each, excluding the display name field */}
                                                {Array.from({ 
                                                    length: Math.ceil((storeFields.length - 1) / 3) 
                                                }).map((_, rowIndex) => {
                                                    const startIndex = rowIndex * 3;
                                                    // Filter out the display name field and get next 3 fields
                                                    const rowFields = storeFields
                                                        .filter(([key]) => key !== displayNameEntry[0])
                                                        .slice(startIndex, startIndex + 3);
                                                    
                                                    if (rowFields.length === 0) return null;
                                                    
                                                    return (
                                                        <InlineStack gap="400" align="start" key={rowIndex}>
                                                            {rowFields.map(([key, value]) => {
                                                                if (value === null || value === undefined) return null;
                                                                
                                                                // Format field name for display (convert snake_case to Title Case)
                                                                const displayKey = key
                                                                    .split('_')
                                                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                                                    .join(' ');
                                                                
                                                                return (
                                                                    <Box 
                                                                        key={key} 
                                                                        width={`${100 / rowFields.length}%`}
                                                                    >
                                                                        <BlockStack gap="100">
                                                                            <Text variant="bodyMd" fontWeight="bold">
                                                                                {displayKey}
                                                                            </Text>
                                                                            <Text color="subdued">
                                                                                {value}
                                                                            </Text>
                                                                        </BlockStack>
                                                                    </Box>
                                                                );
                                                            })}
                                                        </InlineStack>
                                                    );
                                                })}
                                            </BlockStack>
                                        </BlockStack>
                                    </Card>
                                );
                            })}
                        </Box>
                    )}
                </Card>
            )}
            {/* this is the card for the import tab */}
            {selected === 'Import' && (
                <BlockStack gap='1000'>
                    <Card title="Import Store Locations" sectioned>
                        <BlockStack gap='1000'> 
                            <DropZone
                                openFileDialog={openFileDialog}
                                onDrop={handleDropZoneDrop}
                                onFileDialogClose={toggleOpenFileDialog}
                            >
                                <Box padding="4" border="dashed" borderColor="gray">
                                    <BlockStack>
                                        <Text variant="bodyMd">Drop CSV file here or click to upload</Text>
                                    </BlockStack>
                                </Box>
                            </DropZone>
                            <Box padding="4" background="surfaceSecondary">
                                <Text variant="bodyMd" strong>CSV Format Guide</Text>
                                <Text>Required columns: Store Name, Address, City, State, ZIP, Country, Phone, Email, Hours</Text>
                                <Text variant="link">Download template</Text>
                            </Box>
                        </BlockStack>
                    </Card>
                </BlockStack>
            )}
            {/* this is the card for the field selection */}
            {showFieldSelection && (
                <Card sectioned>
                    <Text variant="headingMd">Select Fields to Import</Text>
                    <BlockStack gap="300">
                        {csvHeaders.map((header) => (
                            <Checkbox
                                key={header}
                                label={header}
                                checked={selectedFields.includes(header)}
                                onChange={(checked) => handleFieldSelection(header, checked)}
                            />
                        ))}
                    </BlockStack>
                    <Button
                        primary
                        onClick={handleProcessSelectedFields}
                        disabled={selectedFields.length === 0}
                    >
                        Process Selected Fields
                    </Button>
                </Card>
            )}
            {/* this is the card for the field confirmation */}
            {showFieldConfirmation && (
                <Card sectioned>
                    <Text variant="headingMd">Field Selection</Text>
                    <BlockStack gap="300">
                        <Text variant="bodyMd">Existing Fields:</Text>
                        {existingFields.map((field) => (
                            <Text key={field}>{field}</Text>
                        ))}
                        <Text variant="bodyMd">New Fields:</Text>
                        {newFields.map((field) => (
                            <InlineStack key={field} align="space-between">
                                <Text>{field}</Text>
                                <Checkbox
                                    label="Include"
                                    checked={selectedFields.includes(field)}
                                    onChange={(checked) => {
                                        if (checked) {
                                            setSelectedFields(prev => [...prev, field]);
                                        } else {
                                            setSelectedFields(prev => prev.filter(f => f !== field));
                                        }
                                    }}
                                />
                            </InlineStack>
                        ))}
                    </BlockStack>
                    <Button
                        primary
                        onClick={() => handleFieldConfirmation(true)}
                        disabled={newFields.length === 0}
                    >
                        Confirm Selection
                    </Button>
                </Card>
            )}
        </Page>
    );
}