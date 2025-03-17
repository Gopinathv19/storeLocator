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
import { 
    fetchStores, 
    checkMetaobjectDefinition, 
    createMetaobjectDefinition, 
    createStoreMetaobject,
    fetchMetaobjectDefinitionDetails,
    updateMetaobjectDefinition
} from '../service/storeService';
import { authenticate } from '../shopify.server';

// Loader function to fetch store data
export const loader = async ({ request }) => {
    try {
        const { admin } = await authenticate.admin(request);
        
        // Fetch metaobject definition details
        const definitionResult = await fetchMetaobjectDefinitionDetails(admin);
        
        // Fetch stores if definition exists
        let stores = [];
        let error = null;
        
        if (definitionResult.exists) {
            const storesResult = await fetchStores(admin);
            if (storesResult.status === 200) {
                stores = storesResult.stores;
            } else {
                error = storesResult.error;
            }
        }
        
        return json({ 
            stores, 
            definitionExists: definitionResult.exists,
            fieldDefinitions: definitionResult.exists ? definitionResult.fieldDefinitions : [],
            definitionId: definitionResult.exists ? definitionResult.definitionId : null,
            error 
        });
    } catch (error) {
        return json({ error: 'Failed to load stores' }, { status: 500 });
    }
};

// Action function to handle file uploads and store creation
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'processFile') {
    try {
      const storesData = JSON.parse(formData.get('stores'));
      const selectedFields = JSON.parse(formData.get('selectedFields'));
      
      // Validate input data
      if (!Array.isArray(storesData) || storesData.length === 0) {
        return json({
          success: false,
          message: 'No valid store data provided'
        }, { status: 400 });
      }

      if (!Array.isArray(selectedFields) || selectedFields.length === 0) {
        return json({
          success: false,
          message: 'No fields selected for import'
        }, { status: 400 });
      }

      console.log('Processing:', { selectedFields, storeCount: storesData.length });

      // Check existing definition
      const { exists, definition, fields } = await checkMetaobjectDefinition(admin);
      console.log('Definition check:', { exists, definition });

      let currentDefinition;
      
      // Handle definition creation/update
      try {
        if (!exists) {
          console.log('Creating new definition...');
          const createResult = await createMetaobjectDefinition(admin, selectedFields);
          currentDefinition = createResult.definition;
        } else {
          const existingFieldNames = fields.map(f => f.name);
          const newFields = selectedFields.filter(field => !existingFieldNames.includes(field));
          
          if (newFields.length > 0) {
            console.log('Updating definition with new fields:', newFields);
            const updateResult = await updateMetaobjectDefinition(
              admin,
              definition.id,
              newFields,
              fields
            );
            currentDefinition = updateResult.definition;
          } else {
            currentDefinition = definition;
          }
        }
      } catch (error) {
        return json({
          success: false,
          message: `Failed to ${exists ? 'update' : 'create'} definition: ${error.message}`
        }, { status: 500 });
      }

      // Process stores with batching
      const batchSize = 5;
      const results = [];
      
      for (let i = 0; i < storesData.length; i += batchSize) {
        const batch = storesData.slice(i, i + batchSize);
        const batchPromises = batch.map(async (storeData) => {
          try {
            const result = await createStoreMetaobject(
              admin,
              storeData,
              currentDefinition.fieldDefinitions
            );
            return {
              storeName: storeData[selectedFields[0]] || 'Unknown',
              success: true,
              id: result.store.id
            };
          } catch (error) {
            console.error('Store creation failed:', error);
            return {
              storeName: storeData[selectedFields[0]] || 'Unknown',
              success: false,
              error: error.message
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      // Analyze results
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.length - successCount;
      const failedStores = results.filter(r => !r.success);

      return json({
        success: successCount > 0,
        message: `Created ${successCount} stores${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
        results,
        failedStores: failedCount > 0 ? failedStores : undefined,
        definition: currentDefinition
      }, { 
        status: failedCount > 0 ? 207 : 200 
      });

    } catch (error) {
      console.error('Action error:', error);
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
    const [files, setFiles] = useState([]);
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
    const { stores, definitionExists, fieldDefinitions, definitionId } = useLoaderData();

    useEffect(() => {
        if (definitionExists && fieldDefinitions.length > 0) {
            setExistingFields(fieldDefinitions.map(field => field.name));
        }
    }, [definitionExists, fieldDefinitions]);

    const handleManualSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
    
        try {
            const form = event.currentTarget;
            const formData = new FormData(form);
            formData.append('intent', 'createStore');

            const storeData = {
                storeName: formData.get('storeName'),
                address: formData.get('address'),
                city: formData.get('city'),
                state: formData.get('state'),
                zip: formData.get('zip'),
                country: formData.get('country'),
                phone: formData.get('phone'),
                email: formData.get('email'),
                hours: formData.get('hours'),
                services: formData.get('services')
            };

            formData.append('store',JSON.stringify(storeData));

            await submit(formData,{
                method: 'post',
                replace: true
            });

            setIsAddingStore(false);
        } catch (err) {
            setError(err.message || 'Failed to add store');
        } finally {
            setLoading(false);
        }
    };


    // this two funcitons are going to handle the drop down of the of the add store manually 
    const handleAddStoreClick = () => {
        setIsAddingStore(!isAddingStore);
    };

    

    const handleCancelAdd = () => {
        setIsAddingStore(false);
    };

    const handleButtonClick = useCallback((value) => {
        setSelected(value);
    }, []);

    // end of the functionality

    // the main function going to handle the csv data

    const handleDropZoneDrop = useCallback(async (dropFiles) => {
        if (!dropFiles.length) return;

        try {
            setLoading(true);
            setError(null);

            const file = dropFiles[0];
            const parsedData = await csvReader(file);
            console.log('Parsed Data:', parsedData);

            if (!Array.isArray(parsedData) || parsedData.length === 0) {
                throw new Error('No valid data found in CSV');
            }

            // Get headers from the first row
            const headers = Object.keys(parsedData[0]);
            setCsvHeaders(headers);
            setParsedData(parsedData);
            
            if (definitionExists) {
                // For subsequent uploads, check which fields are new
                const newHeaderFields = headers.filter(header => !existingFields.includes(header));
                
                if (newHeaderFields.length > 0) {
                    setNewFields(newHeaderFields);
                    console.log('Selected Fields:', selectedFields);
                    setShowFieldConfirmation(true);
                } else {
                    // No new fields, just show selection with existing fields pre-selected
                    setSelectedFields(existingFields.filter(field => headers.includes(field)));
                    setShowFieldSelection(true);
                }
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


    // this function is used to handle the checked box msg 
    const handleFieldSelection = (header, checked) => {
        setSelectedFields(prev => 
            checked ? [...prev, header] : prev.filter(field => field !== header)
        );
    };

    const handleFieldConfirmation = (confirmed) => {
        if (confirmed) {
            // User wants to include new fields
            setSelectedFields([...existingFields.filter(field => csvHeaders.includes(field)), ...newFields]);
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

            // Filter the parsed CSV data to only include selected fields
            const filteredData = parsedData.map(row => {
                const filteredRow = {};
                selectedFields.forEach(field => {
                    filteredRow[field] = row[field] || '';
                });
                return filteredRow;
            });
            console.log('Filtered Data:', filteredData);

            const formData = new FormData();
            formData.append('intent', 'processFile');
            formData.append('selectedFields', JSON.stringify(selectedFields));
            formData.append('stores', JSON.stringify(filteredData));
            
            if (definitionExists) {
                formData.append('definitionId', definitionId);
                formData.append('updateDefinition', JSON.stringify(
                    selectedFields.some(field => !existingFields.includes(field))
                ));
            }

            await submit(formData, {
                method: 'post',
                replace: true
            });

            // Reset state after processing
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

                    {isAddingStore ? (
                        <Card sectioned>
                            <Form onSubmit={handleManualSubmit}>
                                <FormLayout>
                                    <TextField
                                        label="Store Name"
                                        name="storeName"
                                        required
                                        autoComplete="off"
                                    />
                                    <TextField
                                        label="Address"
                                        name="address"
                                        required
                                        multiline={2}
                                    />
                                    <InlineStack gap="400">
                                        <TextField
                                            label="City"
                                            name="city"
                                            required
                                        />
                                        <TextField
                                            label="State"
                                            name="state"
                                            required
                                        />
                                        <TextField
                                            label="ZIP"
                                            name="zip"
                                            required
                                        />
                                    </InlineStack>
                                    <TextField
                                        label="Country"
                                        name="country"
                                        required
                                    />
                                    <InlineStack gap="400">
                                        <TextField
                                            label="Phone"
                                            name="phone"
                                            type="tel"
                                        />
                                        <TextField
                                            label="Email"
                                            name="email"
                                            type="email"
                                        />
                                    </InlineStack>
                                    <TextField
                                        label="Hours"
                                        name="hours"
                                        multiline={2}
                                    />
                                    <TextField
                                        label="Services"
                                        name="services"
                                        multiline={2}
                                    />
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
                                </FormLayout>
                            </Form>
                        </Card>
                    ) : (
                        <>
                            {loading ? (
                                <Text>Loading stores...</Text>
                            ) : error ? (
                                <Text>Error: {error}</Text>
                            ) : !stores || stores.length === 0 ? (
                                <Card>
                                    <BlockStack gap="400" alignment="center">
                                        <Text variant="bodyMd" color="subdued">
                                            No store locations found. Click 'Add Store' to create one.
                                        </Text>
                                    </BlockStack>
                                </Card>
                            ) : (
                                stores.map((store) => (
                                    <Card key={store.id || store.storeName}>
                                        <BlockStack gap="400">
                                            <InlineStack gap="400" align='space-between'>
                                                <Box>
                                                    <Text variant="headingMd">{store.store_name}</Text>
                                                    <Text>{`${store.address}, ${store.city}, ${store.state} ${store.zip}`}</Text>
                                                </Box>
                                                <ButtonGroup>
                                                    <Button size='slim'>Edit</Button>
                                                    <Button size='slim' destructive>Delete</Button>
                                                </ButtonGroup>
                                            </InlineStack>
                                            <InlineStack gap="1000">
                                                <Box>
                                                    <Text variant="headingSm">Hours</Text>
                                                    <Text>{store.hours}</Text>
                                                </Box>
                                                <Box>
                                                    <Text variant="headingSm">Contact</Text>
                                                    <Text>{store.phone}</Text>
                                                    <Text>{store.email}</Text>
                                                </Box>
                                                <Box>
                                                    <Text variant="headingSm">Services</Text>
                                                    <Text>{store.services}</Text>
                                                </Box>
                                            </InlineStack>
                                        </BlockStack>
                                    </Card>
                                ))
                            )}
                        </>
                    )}
                </Card>
            )}

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

            {showFieldConfirmation && (
                <Card sectioned>
                    <Text variant="headingMd">Confirm Field Selection</Text>
                    <BlockStack gap="300">
                        <Checkbox
                            label="Include new fields"
                            checked={selectedFields.some(field => !existingFields.includes(field))}
                            onChange={(checked) => handleFieldConfirmation(checked)}
                        />
                    </BlockStack>
                    <Button
                        primary
                        onClick={handleProcessSelectedFields}
                        disabled={selectedFields.length === 0}
                    >
                        Confirm Selection
                    </Button>
                </Card>
            )}
        </Page>
    );
}

