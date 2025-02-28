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
import { useSubmit, useNavigation } from "@remix-run/react";

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
    const [selected, setSelected] = useState('Stores');
    const [openFileDialog, setOpenFileDialog] = useState(false);
  const submit = useSubmit();
  const navigation = useNavigation();

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
    if (!dropFiles.length) return;
    
    setFiles(dropFiles);
    const file = dropFiles[0];
    
    try {
      setLoading(true);
      const text = await file.text();
      console.log('Raw CSV content:', text);

      // Split CSV into rows and remove any empty lines
      const rows = text.split('\n').filter(row => row.trim());
      const headers = rows[0].split(',').map(h => h.trim());
      console.log('CSV headers found:', headers);
      
      const storeData = rows.slice(1).map(row => {
        // Split row by comma, but handle quoted values correctly
        const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        console.log('Row values:', values);

        // Create store object from CSV row
        const store = {};
        headers.forEach((header, index) => {
          // Map the CSV headers to your store fields
          switch(header.toLowerCase().replace(/\s+/g, '')) {
            case 'storename':
            case 'store_name':
              store.storeName = values[index];
              break;
            case 'address':
              store.address = values[index];
              break;
            case 'city':
              store.city = values[index];
              break;
            case 'state':
              store.state = values[index];
              break;
            case 'zip':
              store.zip = values[index];
              break;
            case 'country':
              store.country = values[index];
              break;
            case 'phone':
              store.phone = values[index];
              break;
            case 'email':
              store.email = values[index];
              break;
            case 'hours':
              store.hours = values[index];
              break;
            case 'services':
              store.services = values[index];
              break;
            default:
              console.warn(`Unknown header: ${header}`);
          }
        });

        console.log('Processed store:', store);
        return store;
      });

      console.log('All processed stores:', storeData);

      // Validate the data before sending
      if (!storeData.length) {
        throw new Error('No valid store data found in CSV');
      }

      // Check for required fields
      const missingFields = storeData.find(store => !store.storeName);
      if (missingFields) {
        throw new Error('Store Name is required for all stores');
      }

      const result = await insertStoreData(storeData);
      console.log('Insert result:', result);

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

  const validateStore = (store) => {
    console.log('Validating store:', store);
    const validatedStore = {
      id: store.id || `temp-${Date.now()}`,
      storeName: store.storeName || store.store_name || 'Unnamed Store',
      address: store.address || 'No address',
      city: store.city || 'No city',
      state: store.state || 'No state',
      zip: store.zip || 'No ZIP',
      country: store.country || 'No country',
      phone: store.phone || 'No phone',
      email: store.email || 'No email',
      hours: store.hours || 'Not specified',
      services: store.services || 'Not specified'
    };
    console.log('Validated store:', validatedStore);
    return validatedStore;
  };

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
      const validatedStore = validateStore(store);
      return (
        <Card key={validatedStore.id}>
          <BlockStack gap="400">
            <InlineStack gap="400" align='space-between'>
              <Box>
                <Text variant="headingMd">{validatedStore.storeName}</Text>
                <Text>{`${validatedStore.address}, ${validatedStore.city}, ${validatedStore.state} ${validatedStore.zip}`}</Text>
              </Box>
              <ButtonGroup>
                <Button size='slim'>Edit</Button>
                <Button size='slim' destructive>Delete</Button>
              </ButtonGroup>
            </InlineStack>
            <InlineStack gap="1000">
              <Box>
                <Text variant="headingSm">Hours</Text>
                <Text>{validatedStore.hours}</Text>
              </Box>
              <Box>
                <Text variant="headingSm">Contact</Text>
                <Text>{validatedStore.phone}</Text>
                <Text>{validatedStore.email}</Text>
              </Box>
              <Box>
                <Text variant="headingSm">Services</Text>
                <Text>{validatedStore.services}</Text>
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