import {Page, Text, Card} from '@shopify/polaris';


export default function Settings () {
    return (
        <Page fullWidth>
            <Card sectioned>
                <Text variant='headingLg' as='h6' fontWeight='semibold'>Settings</Text>
            </Card>
        </Page>
    )
}