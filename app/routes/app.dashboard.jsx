import { useState, useCallback } from 'react';
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
import {
    createStoreLocationDefinition,
    updateStoreLocationDefinition,
    deleteStoreLocationDefinition,
    getStoresDetails,
  } from "./api.graphql"; 
export default function Dashboard() {
    const [selected, setSelected] = useState('Stores');
    const [files, setFiles] = useState([]);
    const [openFileDialog, setOpenFileDialog] = useState(false);

    const [store,setStore] = useState([]);

    const handleButtonClick = (value) => {
        setSelected(value);
        console.log(value);
    }

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

    // const handleDropZoneDrop = useCallback(
    //     async(dropFiles) =>{
    //         if(dropFiles.length > 0){
    //             try{
    //                 const file =dropFiles[0];
    //                 const parsedData = await csvReader(file);
    //                 console.log(parsedData);
    //                 console.log(parsedData);
    //                 setFiles(parsedData);
    //             }catch(error){
    //                 console.error('Error reading file:', error);
    //             }

    //         }
    //     },
    //     []
    // );



    const handleDropZoneDrop = async (dropFiles) => {
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


      async function insertStoreData(StoreData){
        try{
          const result =  await createStoreLocationDefinition(StoreData);
          if(!result.success){
            throw new Error(result.message);
          }
          return result;
        }
        catch(error){
              setError(`Error inserting the data ${error.message}`)
              return null;
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
                    {files && files.length > 0 ? (
                        files.map((store, index) => (
                            <Card key={index}>
                                <BlockStack gap="400">
                                    <InlineStack gap="400" align='space-between'>
                                        <Box>
                                            <Text variant="headingMd">{store['Store Name'] || store['store_name'] || 'Store Name'}</Text>
                                            <Text>{`${store['Address'] || store['address'] || ''}, ${store['City'] || store['city'] || ''}, ${store['State'] || store['state'] || ''} ${store['ZIP'] || store['zip'] || ''}`}</Text>
                                        </Box>
                                        <ButtonGroup>
                                            <Button size='slim'>Edit</Button>
                                            <Button size='slim' destructive>Delete</Button>
                                        </ButtonGroup>
                                    </InlineStack>
                                    <InlineStack gap="1000">
                                        <Box>
                                            <Text variant="headingSm">Hours</Text>
                                            <Text>{store['Hours'] || store['hours'] || 'Not specified'}</Text>
                                        </Box>
                                        <Box>
                                            <Text variant="headingSm">Contact</Text>
                                            <Text>{store['Phone'] || store['phone'] || 'Not specified'}</Text>
                                            <Text>{store['Email'] || store['email'] || 'Not specified'}</Text>
                                        </Box>
                                        <Box>
                                            <Text variant="headingSm">Services</Text>
                                            <Text>{store['Services'] || store['services'] || 'Not specified'}</Text>
                                        </Box>
                                    </InlineStack>
                                </BlockStack>
                            </Card>
                        ))
                    ) : (
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