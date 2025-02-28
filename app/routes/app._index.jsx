import { useState, useEffect, useCallback } from "react";
import {
  Button,
  InlineStack,
  BlockStack,
  Box,
  Text,
  CalloutCard,
  Page,
  InlineGrid,
  Card,
  Grid,
  Divider,
  Spinner,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useActionData, useNavigate, useSubmit } from "@remix-run/react";
import { json } from "@remix-run/node";
import content from "../locals/en.json";
import featureFlag from "../configs/feature_flag.json";
import { planDetails } from "../configs/plan_details_variables";
import "../CSS/common.css";
import { fetchPlanDetails } from "../models/fetchPlanDetailsFromDB.server";
import { planUpdate } from "../models/planUpdate.server";

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const type = formData.get("type");
  try {
    if (type === "planUpdate") {
      const planName = formData.get("planName");
      const clickedIndex = formData.get("clickedIndex");
      const actionData = await planUpdate(admin, planName, clickedIndex);
      return json({
        status: actionData.status,
        message: actionData.message,
        data: actionData.data,
        type: type,
        planName: planName,
        index: clickedIndex,
      });
    } else if (type === "initialFetch") {
      const actionData = await fetchPlanDetails(admin);
      return json({
        status: actionData.status,
        message: actionData.message,
        data: actionData.data,
        type: type,
      });
    }
  } catch (error) {
    return json({
      status: 400,
      message: "Something went wrong",
      data: null,
    });
  }
};

export default function Plan() {
  const actionData = useActionData();
  const submit = useSubmit();
  const navigate = useNavigate();

  const [planUpdateLoading, setPlanUpdateLoading] = useState(false);

  const [pageLoading, setPageLoading] = useState(false);
  const [planName, setPlanName] = useState();

  useEffect(() => {
    setPageLoading(true);
    const formData = new FormData();
    formData.append("type", "initialFetch");
    submit(formData, { method: "post" });
  }, []);

  useEffect(() => {
    if (actionData?.type === "initialFetch" && actionData?.status === 200) {
      if (actionData?.data === null) {
        setPageLoading(false);
      }
      if (actionData?.data !== null && actionData?.data === "freePlan") {
        setPageLoading(false);
        setPlanName(actionData?.data);
      } else if (actionData?.data !== null && actionData?.data !== "freePlan") {
        navigate("/app/dashboard");
      }
    } else if (
      actionData?.type === "initialFetch" &&
      actionData?.status !== 200
    ) {
      setPageLoading(false);
    }
  }, [actionData]);

  useEffect(() => {
    if (
      actionData?.type === "planUpdate" &&
      actionData?.planName === "freePlan" &&
      actionData?.status === 200
    ) {
      setPlanUpdateLoading(false);
      navigate("/app/onboarding");
    } else if (
      actionData?.type === "planUpdate" &&
      actionData?.planName === planDetails[actionData?.index]?.planKey &&
      actionData?.status === 200
    ) {
      window.parent.location.href = `${actionData?.data}`;
      setPlanUpdateLoading(false);
    } else if (
      (actionData?.planName === "freePlan" ||
        actionData?.planName === planDetails[actionData?.index]?.planKey) &&
      actionData?.status !== 200
    ) {
      setPlanUpdateLoading(false);
      shopify.toast.show(actionData?.message, { isError: true });
    }
  }, [actionData]);

  const plansToDisplay = featureFlag.plan_page.show_free_plan
    ? planDetails
    : planDetails.filter((plan) => plan.planKey !== "freePlan");

  const handlePlanUpdate = (index) => {
    setPlanUpdateLoading((prev) => ({
      ...prev,
      [index]: true,
    }));
    const formData = new FormData();
    formData.append("type", "planUpdate");
    formData.append("planName", planDetails[index].planKey);
    formData.append("clickedIndex", index);
    submit(formData, { method: "post" });
  };

  console.log("the plan name is: ", planName);

  return (
    <>
      {!pageLoading ? (
        <Page fullWidth>
          <BlockStack align="center" inlineAlign="center" gap="400">
            <CalloutCard
              illustration={content.plan_page.img_src}
              title={content.plan_page.heading}
              primaryAction={[]}
            >
              {content.plan_page.description}
            </CalloutCard>
            <Text variant="headingLg" as="h6" fontWeight="semibold">
              {content.plan_page.heading_2}
            </Text>

            <InlineStack blockAlign="center" gap="300">
              {plansToDisplay.map((plan, index) => (
                <Card sectioned key={index}>
                  <Box
                    style={{
                      width: "300px",
                      height: "320px",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <BlockStack gap="300">
                      <Text variant="headingLg" as="h6" fontWeight="semibold">
                        {plan.planName}
                      </Text>
                      {plan.pricePrefix && (
                        <Text variant="headingMd" as="h6" fontWeight="bold">
                          {content.plan_page[plan.pricePrefix]}
                          {plan.amount}
                          {content.plan_page[plan.priceText]}
                        </Text>
                      )}
                      <Divider />
                      {plan.features.map((feature, idx) => (
                        <InlineStack key={idx} gap="300" blockAlign="center">
                          <Box
                            style={{
                              width: "25px",
                              height: "25px",
                              borderRadius: "13px",
                              backgroundColor: "rgba(0, 122, 92, 0.1)",
                              color: "rgba(0,122,92,1)",
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              fontSize: "1rem",
                            }}
                          >
                            &#10004;
                          </Box>
                          <Text variant="bodyLg" as="p" fontWeight="semibold">
                            {feature}
                          </Text>
                        </InlineStack>
                      ))}
                    </BlockStack>

                    <Button
                      id="placing"
                      variant="primary"
                      onClick={() => handlePlanUpdate(index)}
                      loading={planUpdateLoading[index]}
                      disabled={planDetails[index].planKey === planName}
                    >
                      {plan.buttonLabel}
                    </Button>
                  </Box>
                </Card>
              ))}
            </InlineStack>
          </BlockStack>
        </Page>
      ) : (
        <Box
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <Spinner />
        </Box>
      )}
    </>
  );
}
