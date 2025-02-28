import {
  BlockStack,
  Button,
  Card,
  DataTable,
  Icon,
  InlineStack,
  Page,
  Text,
} from "@shopify/polaris";
import { EditIcon, DeleteIcon, ViewIcon } from '@shopify/polaris-icons';

export default function MyReviews() {
  const reviews = [
    {
      productName: "Product 1",
      reviewerName: "John Doe",
      rating: 4.5,
      reviewDescription: "This is a great product!",
      reviewOn: "2024-01-01",
      status: "Published",
    },
    {
      productName: "Product 2",
      reviewerName: "Jane Smith",
      rating: 5.0,
      reviewDescription: "Excellent quality and fast delivery",
      reviewOn: "2024-02-15",
      status: "Stage",
    },
    {
      productName: "Product 3",
      reviewerName: "Mike Johnson",
      rating: 3.5,
      reviewDescription: "Good but could be better",
      reviewOn: "2024-03-01",
      status: "Flag",
    },
  ];

  // Transform the reviews array into the format required by DataTable
  const rows = reviews.map((review) => [
    review.productName,
    review.reviewerName,
    review.rating.toString(),
    review.reviewDescription,
    review.reviewOn,
    review.status,
    <InlineStack gap="100">
      <Button plain variant="tertiary">
        <Icon source={ViewIcon} tone="base" />
      </Button>
      <Button plain variant="tertiary">
        <Icon source={EditIcon} tone="base" />
      </Button>
      <Button plain variant="tertiary">
        <Icon source={DeleteIcon} tone="critical" />
      </Button>
    </InlineStack>
  ]);

  return (
    <Page fullWidth>
      <Card>
        <BlockStack gap="800">
          <InlineStack align="space-between" gap="300">
            <Text variant="headingLg" as="h1" fontWeight="bold">
              My Reviews
            </Text>
            <Button>Import Reviews</Button>
          </InlineStack>
          <InlineStack gap="300" align="end">
            <Button>Published</Button>
            <Button>Stage</Button>
            <Button>Flag</Button>
            <Button>Unpublished</Button>
          </InlineStack>
          <DataTable
            columnContentTypes={[
              "text",
              "text",
              "numeric",
              "text",
              "text",
              "text",
              "text",
            ]}
            headings={[
              "Product Name",
              "Reviewer Name",
              "Rating",
              "Review Description",
              "Review on",
              "Status",
              "Action",
            ]}
            rows={rows}
          />
        </BlockStack>
      </Card>
    </Page>
  );
}
