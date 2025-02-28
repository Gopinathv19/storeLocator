import {useState,useCallback, useEffect} from 'react';
import { authenticate } from '../shopify.server';
import {json} from '@remix-run/node'
import {useActionData, useNavigate, useSubmit}  from '@remix-run/react';
import {Modal, TitleBar} from '@shopify/app-bridge-react'
import {Page, BlockStack, InlineStack, Card, Button, Thumbnail, Text, TextField, DropZone, Select, Box, Spinner} from '@shopify/polaris'
import {ImportIcon} from '@shopify/polaris-icons';
import content from '../locals/en.json'


import { savePlanDetailsToDatabase } from '../models/savePlanDetailsToDatabase.server';
import { fetchPlanDetails } from '../models/fetchPlanDetailsFromDB.server';


export const action = async ({request}) => {
    const {admin} = await authenticate.admin(request);
    const formData = await request.formData();
    const type = formData.get('type')
    try{
        if(type === 'initialFetch'){
            const planDetails = await fetchPlanDetails(admin)
            
            return json({
                status: planDetails.status,
                message: planDetails.message,
                data: planDetails.data,
                type: type
            })
        } else if(type ==='statusChange') {
            

                const actionData = await savePlanDetailsToDatabase(admin);
                return json({
                    status: actionData.status,
                    message: actionData.message,
                    data: actionData.data,
                    type: type
                })
            
        }
    }catch(error){
        return json({
            status: 400,
            message: "Something went wrong",
            data: null
        })
    }
}

export default function Onboarding () {

    const actionData = useActionData();
    const navigate = useNavigate();
    const submit =useSubmit();

    const [pageLoading, setPageLoading] = useState(false);
    const [statusChangeLoading, setStatusChangeLoading] = useState(false)

    const [planModalOpen, setPlanModalOpen] = useState(false);
    const handlePlanModalOpen = () => {
        setPlanModalOpen(true);
    }
    const handlePlanModalClose = () => {
        setPlanModalOpen(false);
    }
   

    useEffect (() => {
        setPageLoading(true);
        const formData = new FormData();
        formData.append('type', 'initialFetch');
        submit(formData, {method:'post'});
    }, [])

    useEffect (() => {
        if(actionData?.type === 'initialFetch' && actionData?.status === 200){
            setPageLoading(false);
        }else if(actionData?.type === 'initialFetch' && actionData?.status !== 200){
            setPageLoading(false);
            shopify.toast.show(actionData?.message, {isError: true})
            
        }
    }, [actionData])

    useEffect (() => {
        if(actionData?.type === 'statusChange' && actionData?.status === 200){
            setStatusChangeLoading(false)
            navigate('/app/dashboard')
        }else if(actionData?.type === 'statusChange' && actionData?.status !== 200){
            setStatusChangeLoading(false)
            shopify.toast.show(actionData?.message, {isError: true})
            handlePlanModalOpen();
        }
    }, [actionData])

    const handleDashboardNavigate = () => {
        setStatusChangeLoading(true)
        const formData = new FormData();
        formData.append('type', 'statusChange');
        submit(formData, {method:'post'})
    }

    const handlePlanPageNavigate = () => {
        navigate('/app')
    }

    const handleLimitedAccessNavigate = () => {
        handlePlanModalClose();
        navigate('/app/dashboard')
    }

    return (
       <>
    {!pageLoading ? <Page fullWidth>
        <BlockStack align='center' inlineAlign='center' gap='300'>
            <Text variant='headingLg' as='h5' fontWeight='semibold'>
                {content.onboarding.heading_1}
            </Text>
            <Text variant='bodyLg' as='p' fontWeight='regular'>
                {content.onboarding.description_1}
            </Text>
            <InlineStack align='start' blockAlign='center' gap='400'>
                <Card sectioned>
                    <Box style={{ width: '300px' }}>
                        <BlockStack align='center' gap='800' inlineAlign='center'>
                            <Thumbnail source={content.onboarding.img_1} size='large' />
                            <Text variant='headingLg' as='h6' fontWeight='semibold'>
                                {content.onboarding.heading_2}
                            </Text>
                            <Text variant='bodyLg' as='p' fontWeight='bold' textAlign='justify'>
                                {content.onboarding.description_2}
                            </Text>
                            <Button icon={ImportIcon} variant='primary' size='large' fullWidth>
                                {content.onboarding.button_1}
                            </Button>
                        </BlockStack>
                    </Box>
                </Card>

                <Card sectioned>
                    <Box style={{ width: '300px' }}>
                        <BlockStack align='center' gap='800' inlineAlign='center'>
                            <Thumbnail source={content.onboarding.img_2} size='large' />
                            <Text variant='headingLg' as='h6' fontWeight='semibold'>
                                {content.onboarding.heading_3}
                            </Text>
                            <Text variant='bodyLg' as='p' fontWeight='bold' textAlign='justify'>
                                {content.onboarding.description_3}
                            </Text>
                            <Button variant='primary' size='large' fullWidth onClick={handleDashboardNavigate} loading={statusChangeLoading}>
                                {content.onboarding.button_2}
                            </Button>
                        </BlockStack>
                    </Box>
                </Card>
            </InlineStack>
            <Button variant='plain'>{content.onboarding.button_3}</Button>
        </BlockStack>
    </Page> : (
        <Box style={{display:'flex', justifyContent:'center', alignItems:'center', height:'100vh'}}>
            <Spinner />
        </Box>
    )}

<Modal open={planModalOpen} onHide={handlePlanModalClose}>
    <TitleBar title={content.onboarding.modal_1_heading}></TitleBar>
    <Box style={{padding:'10px'}}>
        <Text variant='bodyLg' as='p' fontWeight='bold'>
            {content.onboarding.modal_1_description}
        </Text>
    </Box>
    <Box style={{height:'3rem', padding:'10px', backgroundColor: "rgba(128, 128, 128, 0.1)"}}>
        <InlineStack align='end' blockAlign='center' gap='300'>
            <Button onClick={handleLimitedAccessNavigate}>{content.onboarding.modal_1_button_1}</Button>
            <Button onClick={handlePlanPageNavigate} variant='primary'>{content.onboarding.modal_1_button_2}</Button>
        </InlineStack>
    </Box>
</Modal>
    </>
    
    )
}