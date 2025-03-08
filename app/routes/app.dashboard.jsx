import { useState, useCallback, useEffect } from 'react';
import { Page, 
        Card, 
        Text, 
        ButtonGroup, 
        Button,
        Box, 
        InlineStack, 
        BlockStack,
        DropZone,
} from '@shopify/polaris';
import { StoreIcon, ImportIcon, ColorIcon, SearchIcon, SettingsIcon } from '@shopify/polaris-icons';
import { useSubmit, useLoaderData } from '@remix-run/react';
import csvReader from '../helper/csvReader';
import { json } from '@remix-run/node';
import { fetchStores, checkMetaobjectDefinition, createMetaobjectDefinition } from '../service/storeService';

import { authenticate } from  '../shopify.server'

export const loader = async ({request}) => {
    const {admin} = await authenticate.admin(request);
    const {status,stores,error} = await fetchStores(admin);

    if(status !== 200){
        return json({error},{status});
    }

    return json ({stores});
}

export default function Dashboard() {
    const [selected, setSelected] = useState('Stores');
    const [files, setFiles] = useState([]);
    const [openFileDialog, setOpenFileDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const submit = useSubmit();
    const { stores } = useLoaderData();

    const handleButtonClick = (value) => {
        setSelected(value);
        console.log(value);
    }

    const handleDropZoneDrop = async (dropFiles) => {
        if (!dropFiles.length) {
            console.log('No files dropped');
            return;
        }

        try {
            setLoading(true);
            
            // lets check the meta object definition 

            const {admin} = await authenticate.admin();

            const checkResult = await checkMetaobjectDefinition(admin);

            if(!checkResult.exists){
                const createDefinition = await createMetaobjectDefinition(admin);
                if(createDefinition.status !== 200){
                    throw new Error('Failed to create metaobject definition');
                }
            }

            // Process CSV file
            const parsedData = await csvReader(dropFiles[0]);
            
            for (const row of parsedData){
                const storeData = {
                    storeName: row['Store Name'],
                    address: row['Address'],
                    city: row['City'],
                    state: row['State'],
                    zip: row['ZIP'],
                    country: row['Country'],
                    phone: row['Phone'],
                    email: row['Email'],
                    hours: row['Hours'],
                    services: row['Services']
                };

                const createResult = await createStoreMetaobject(admin,storeData);
                if(createResult.status !== 200){
                    throw new Error('Failed to create store metaobject');
                }
            }

            console.log('All stores processed successfully');
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

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
                <ButtonGroup>
                    {buttons.map((button) => (
                        <Button
                            key={button.name}
                            onClick={() => handleButtonClick(button.name)}
                            variant={selected === button.name ? 'primary' : 'secondary'}
                            icon={button.icon}
                        >
                            {button.name}
                        </Button>
                    ))}
                </ButtonGroup>
            </Card>

            {selected === 'Stores' && (
                <Card>
                    <Text variant='heading2xl' as='h6'>Store Locations</Text>
                    {loading ? (
                        <Text>Loading stores...</Text>
                    ) : error ? (
                        <Text>Error: {error}</Text>
                    ) : !stores || stores.length === 0 ? (
                        <Card>
                            <BlockStack gap="400" alignment="center">
                                <Text variant="bodyMd" color="subdued">
                                    No store locations found. Import stores using the Import tab.
                                </Text>
                                <Button 
                                    onClick={() => handleButtonClick('Import')}
                                    icon={ImportIcon}
                                >
                                    Import Stores
                                </Button>
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
        </Page>
    );
}