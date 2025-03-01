import { useState, useCallback, useEffect } from 'react';
import { Page, 
        Card, 
        Text, 
        ButtonGroup, 
        Button ,
        Box, 
        InlineStack, 
        BlockStack,
        DropZone,
        Icon
        } from '@shopify/polaris';
import { StoreIcon, ImportIcon, ColorIcon, SearchIcon, SettingsIcon, UploadIcon } from '@shopify/polaris-icons';
import csvReader from '../helper/csvReader';
import { insertStoreData } from '../graphql/insertStoreData';
import { getStoresDetails } from '../graphql/getStoresDetails';

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState('Stores');
  const [openFileDialog, setOpenFileDialog] = useState(false);

  const handleButtonClick = (buttonName) => {
    setSelected(buttonName);
  };

  const toggleOpenFileDialog = useCallback(() => {
    setOpenFileDialog(false);
  }, []);

  useEffect(() => {
    fetchStores();
  }, []);

  async function fetchStores() {
    try {
      setLoading(true);
      console.log('Fetching stores...');
      const storesData = await getStoresDetails();
      console.log('Fetched stores data:', storesData);
      setStores(storesData || []);
      setError(null);
    } catch (err) {
      console.error('Error in fetchStores:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDropZoneDrop(dropFiles) {
    if (!dropFiles.length) {
      console.log('No files dropped');
      return;
    }
    
    setFiles(dropFiles);
    const file = dropFiles[0];
    
    try {
      setLoading(true);
      // Use csvReader to parse the file
      const parsedData = await csvReader(file);
      console.log('Parsed CSV data:', parsedData);

      // Map the CSV data to store format
      const storeData = parsedData.map(row => {
        // Create store object from CSV row
        const store = {
          storeName: row['Store Name'] || '',
          address: row['Address'] || '',
          city: row['City'] || '',
          state: row['State'] || '',
          zip: row['ZIP'] || '',
          country: row['Country'] || '',
          phone: row['Phone'] || '',
          email: row['Email'] || '',
          hours: row['Hours'] || '',
          services: row['Services'] || ''
        };

        console.log('Processing store:', store);

        return store;
      });

      console.log('Processed store data:', storeData);

      // Insert the store data
      const result = await insertStoreData(storeData);
      console.log('Insert result:', result);

      // Refresh the store list
      await fetchStores();
      setFiles([]);
      setError(null);
    } catch (err) {
      console.error('Error processing CSV:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const renderStores = () => {
    console.log('Rendering stores. Current stores:', stores);
    console.log('Loading state:', loading);
    console.log('Error state:', error);

    if (loading) return <Text>Loading stores...</Text>;
    if (error) return <Text>Error loading stores: {error}</Text>;
    if (!stores || !stores.length) {
      console.log('No stores found');
      return (
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
      );
    }

    return stores.map((store) => {
       
      return (
        <Card key={store.storeName}>
          <BlockStack gap="400">
            <InlineStack gap="400" align='space-between'>
              <Box>
                <Text variant="headingMd">{ store.storeName}</Text>
                <Text>{`${ store.address}, ${ store.city}, ${ store.state} ${ store.zip}`}</Text>
              </Box>
              <ButtonGroup>
                <Button size='slim'>Edit</Button>
                <Button size='slim' destructive>Delete</Button>
              </ButtonGroup>
            </InlineStack>
            <InlineStack gap="1000">
              <Box>
                <Text variant="headingSm">Hours</Text>
                <Text>{ store.hours}</Text>
              </Box>
              <Box>
                <Text variant="headingSm">Contact</Text>
                <Text>{ store.phone}</Text>
                <Text>{ store.email}</Text>
              </Box>
              <Box>
                <Text variant="headingSm">Services</Text>
                <Text>{ store.services}</Text>
              </Box>
            </InlineStack>
          </BlockStack>
        </Card>
      );
    });
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
          {renderStores()}
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