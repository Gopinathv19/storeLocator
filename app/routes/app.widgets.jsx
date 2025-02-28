import {Page, Text, Card} from '@shopify/polaris';


export default function Widgets () {
    return (
        <Page fullWidth>
            <Card sectioned>
                <Text variant='headingLg' as='h6' fontWeight='semibold'>Widgets</Text>
            </Card>
        </Page>
    )
}