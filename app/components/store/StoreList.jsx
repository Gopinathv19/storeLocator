import { Card, Text, ButtonGroup, Button } from '@shopify/polaris';
import StoreCard from './StoreCard';

export function StoreList({ stores, onEdit, onDelete }) {
  if (!stores || stores.length === 0) {
    return (
      <Card>
        <Text variant="bodyMd" color="subdued">
          No store locations found. Click 'Add Store' to create one.
        </Text>
      </Card>
    );
  }

  return (
    <>
      {stores.map((store) => (
        <StoreCard 
          key={store.id || store.storeName}
          store={store}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}