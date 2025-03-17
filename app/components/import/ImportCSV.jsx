import { DropZone, Card, Text, Box } from '@shopify/polaris';

export function ImportCSV({ onDrop, openFileDialog, onFileDialogClose }) {
  return (
    <Card title="Import Store Locations" sectioned>
      <DropZone
        openFileDialog={openFileDialog}
        onDrop={onDrop}
        onFileDialogClose={onFileDialogClose}
      >
        <Box padding="4" border="dashed" borderColor="gray">
          <Text variant="bodyMd">Drop CSV file here or click to upload</Text>
        </Box>
      </DropZone>
    </Card>
  );
}