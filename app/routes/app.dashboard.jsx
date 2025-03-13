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
    processStoreImport
} from '../service/storeService';
import { authenticate } from '../shopify.server';

// Loader function to fetch store data
export const loader = async ({ request }) => {
    try {
        const { admin } = await authenticate.admin(request);
        const { status, stores, error } = await fetchStores(admin);

        if (status !== 200) {
            return json({ error }, { status });
        }

        return json({ stores, admin });
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
            if (!Array.isArray(storesData) || storesData.length === 0) {
                return json({ 
                    success: false,
                    message: 'No valid store data provided' 
                }, { status: 400 });
            }

            const result = await processStoreImport(admin, storesData);
            
            return json({
                success: result.status === 200,
                message: result.data?.message || result.error,
                details: result.data || result.details
            }, { status: result.status });

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
    const [files, setFiles] = useState([]);
    const [openFileDialog, setOpenFileDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isAddingStore, setIsAddingStore] = useState(false);
    const [parsedCsvData, setParsedCsvData] = useState(null);
    const [showFieldSelection, setShowFieldSelection] = useState(false);
    const [csvHeaders, setCsvHeaders] = useState([]);
    const [selectedFields, setSelectedFields] = useState([]);

    const submit = useSubmit();
    const { stores } = useLoaderData();

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

    const handleAddStoreClick = () => {
        setIsAddingStore(!isAddingStore);
    };

    

    const handleCancelAdd = () => {
        setIsAddingStore(false);
    };

    const handleButtonClick = useCallback((value) => {
        setSelected(value);
    }, []);

    const handleDropZoneDrop = useCallback(async (dropFiles) => {
        if (!dropFiles.length) return;

        try {
            setLoading(true);
            setError(null);

            const file = dropFiles[0];
            const parsedData = await csvReader(file);

            if (!Array.isArray(parsedData) || parsedData.length === 0) {
                throw new Error('No valid data found in CSV');
            }

            const headers = Object.keys(parsedData[0]);

            setCsvHeaders(headers);
            setParsedCsvData(parsedData);
            setShowFieldSelection(true);

            const formData = new FormData();
            formData.append('intent', 'processFile');
            formData.append('stores', JSON.stringify(parsedData));

            // Submit and let Remix handle the response
            await submit(formData, { 
                method: 'post',
                replace: true // This will update the page with the server response
            });

        } catch (err) {
            setError(err.message || 'Failed to process file');
        } finally {
            setLoading(false);
        }
    }, [submit]);

    const handleFieldSelection = (header,checked) => {
        setSelectedFields(prev => 
            checked ? [...prev,header]
            :prev.filter(field => field !== header)
        )
    }

    const handleProcessSelectedFields = async () => {
        try {
            setLoading(true);
            setError(null);

            const fieldDefinitions = selectedFields.map(field => ({
                name: field,
                key: field.toLowerCase().replace(/\s+/g, '_'),
                type: "single_line_text_field"
            }));

            const formData = new FormData();
            formData.append('intent', 'processFile');
            formData.append('fieldDefinitions', JSON.stringify(fieldDefinitions));
            formData.append('stores', JSON.stringify(parsedCsvData));

            await submit(formData, {
                method: 'post',
                replace: true
            });

            setShowFieldSelection(false);
            setParsedCsvData(null);
            setCsvHeaders([]);
            setSelectedFields([]);

        } catch (err) {
            setError(err.message || 'Failed to process fields');
        } finally {
            setLoading(false);
        }
    }

    const toggleOpenFileDialog = useCallback(
        () => setOpenFileDialog((openFileDialog) => !openFileDialog),
        [],
    );

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
                        {showFieldSelection ? (
                            <BlockStack gap='400'>
                                <Text variant="headingMd">Select Fields to Import</Text>
                                <BlockStack gap='300'>
                                    {csvHeaders.map((header) => (
                                        <Checkbox
                                            key={header}
                                            label={header}
                                            checked={selectedFields.includes(header)}
                                            onChange={(checked) => handleFieldSelection(header, checked)}
                                        />
                                    ))}
                                </BlockStack>
                                <InlineStack gap='300'>
                                    <Button
                                        primary
                                        onClick={handleProcessSelectedFields}
                                        disabled={selectedFields.length === 0}
                                        loading={loading}
                                    >
                                        Process Selected Fields
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setShowFieldSelection(false);
                                            setParsedCsvData(null);
                                            setCsvHeaders([]);
                                            setSelectedFields([]);
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </InlineStack>
                            </BlockStack>
                        ) : (
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
                            </BlockStack>
                        )}
                    </Card>
                </BlockStack>
            )}
        </Page>
    );
}