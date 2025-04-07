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
    const htmlContent = `
      <style>
        .store-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-family: Arial, sans-serif;
        }
        .store-table th, .store-table td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        .store-table th {
          background-color: #f8f9fa;
          color: #333;
          font-weight: bold;
        }
        .store-table tr:nth-child(even) {
          background-color: #f8f9fa;
        }
        .store-table tr:hover {
          background-color: #f5f5f5;
        }
        .page-title {
          color: #333;
          font-family: Arial, sans-serif;
          margin-bottom: 20px;
        }
      </style>
      <h1 class="page-title">Store Locations</h1>
      <table class="store-table">
        <thead>
          <tr>
            ${Object.keys(stores[0] || {}).map(key => 
              `<th>${key.replace(/_/g, ' ').toUpperCase()}</th>`
            ).join('')}
          </tr>
        </thead>
        <tbody>
          ${stores.map(store => `
            <tr>
              ${Object.values(store).map(value => 
                `<td>${value || ''}</td>`
              ).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    return htmlContent;
};

const updateStoreLocationsPage = async (admin, stores) => {
    try {
        if (!stores || stores.length === 0) {
            console.error('No stores provided to update page');
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
                mutation {
                    pageUpdate(
                        input: {
                            id: "${existingPage.id}",
                            title: "Store Locations",
                            body: ${JSON.stringify(pageContent)},
                            published: true
                        }
                    ) {
                        page {
                            id
                            title
                            body
                        }
                        userErrors {
                            field
                            message
                        }
                    }
                }
            `;

            const updateResponse = await admin.graphql(updateMutation);
            const updateResult = await updateResponse.json();
            console.log('Update response:', updateResult);

            if (updateResult.data?.pageUpdate?.userErrors?.length > 0) {
                throw new Error(updateResult.data.pageUpdate.userErrors[0].message);
            }
        } else {
            // Create new page
            const createMutation = `
                mutation {
                    pageCreate(
                        input: {
                            title: "Store Locations",
                            body: ${JSON.stringify(pageContent)},
                            published: true,
                            handle: "store-locations"
                        }
                    ) {
                        page {
                            id
                            title
                            body
                        }
                        userErrors {
                            field
                            message
                        }
                    }
                }
            `;

            const createResponse = await admin.graphql(createMutation);
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
                            {stores.map((store, index) => (
                                <Card key={store.id} sectioned>
                                    <BlockStack gap="400">
                                        {/* Store name - full width */}
                                        <Text variant="headingLg" as="h6">
                                            {store.store_name || 'Unnamed Store'}
                                        </Text>

                                        {/* Grid layout for other fields */}
                                        <BlockStack gap="400">
                                            {/* Process fields in groups of 3 */}
                                            {Array.from({ 
                                                length: Math.ceil((fieldDefinitions.length - 1) / 3) 
                                            }).map((_, rowIndex) => {
                                                const startIndex = (rowIndex * 3) + 1;
                                                const rowFields = fieldDefinitions.slice(
                                                    startIndex, 
                                                    startIndex + 3
                                                );
                                                
                                                return (
                                                    <InlineStack gap="400" align="start" key={rowIndex}>
                                                        {rowFields.map((field) => {
                                                            const fieldValue = store[field.name.toLowerCase()];
                                                            return fieldValue ? (
                                                                <Box 
                                                                    key={field.name} 
                                                                    width={`${100 / rowFields.length}%`}
                                                                >
                                                                    <BlockStack gap="100">
                                                                        <Text variant="bodyMd" fontWeight="bold">
                                                                            {field.name}
                                                                        </Text>
                                                                        <Text color="subdued">
                                                                            {fieldValue}
                                                                        </Text>
                                                                    </BlockStack>
                                                                </Box>
                                                            ) : null;
                                                        })}
                                                    </InlineStack>
                                                );
                                            })}
                                        </BlockStack>
                                    </BlockStack>
                                </Card>
                            ))}
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