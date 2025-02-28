import { 
  BlockStack,
  Button,
  Card,
  FormLayout,
  Icon,
  InlineStack,
  Page,
  ProgressBar,
  RadioButton,
  Text,
  Box,
} from "@shopify/polaris";
 
import { useState } from "react";
import content from "../locals/en.json";

export default function InitForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selected, setSelected] = useState('');
  const totalSteps = 4;
  
  
  const progress = (currentStep / totalSteps) * 100;

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  return (
    <Page fullWidth>
      <Card padding="500">
        <BlockStack gap="600">
          {/* Progress Section */}
          <Box paddingInlineStart="400" paddingInlineEnd="400">
            <BlockStack gap="300">
              <ProgressBar
                progress={progress}
                size="small"
                tone={progress === 100 ? "success" : "primary"}
              />
              <Text variant="bodySm" as="p" alignment="center">
                Step {currentStep} of {totalSteps}
              </Text>
            </BlockStack>
          </Box>

          {/* Step 1 */}
          {currentStep === 1 && (
            <Card padding="400" roundedAbove="sm">
              <BlockStack gap="400" alignment="center">
                <Text variant="heading2xl" as="h1" fontWeight="bold" alignment="center">
                  {content.init_form.step1_heading_1}
                </Text>
                <Text variant="bodyLg" as="p" alignment="center">
                  {content.init_form.step1_description_1}
                </Text>
              </BlockStack>
            </Card>
          )}

          {/* Step 2 */}
          {currentStep === 2 && (
            <Card padding="400" roundedAbove="sm">
              <BlockStack gap="400">
                <Text variant="heading2xl" as="h1" fontWeight="bold" alignment="center">
                  {content.init_form.step2_heading_1}
                </Text>
              </BlockStack>
            </Card>
          )}

            {currentStep === 3 && (
              <Card padding="400" roundedAbove="sm">
                <BlockStack gap="400" alignment="center">
                  <Box maxWidth="400px">
                    <Text variant="heading2xl" as="h1" fontWeight="bold" alignment="center">
                      {content.init_form.step3_heading_1}
                    </Text>
                    <Text variant="bodyLg" as="p" alignment="center">
                      {content.init_form.step3_description_1}
                    </Text>
                  </Box>
                  
                  <FormLayout>
                    <BlockStack gap="300">
                      <Card padding="300" width="400px">
                        <BlockStack gap="300">
                          <Box paddingBlockStart="200" paddingBlockEnd="200">
                            <RadioButton
                              label={<Text variant="bodyMd">Minimal</Text>}
                              checked={selected === "minimal"}
                              onChange={() => setSelected("minimal")}
                            />
                          </Box>
                          <Card background="bg-fill-secondary" padding="300">
                            <Text variant="bodyMd" as="p">
                              {content.init_form.step3_option_1_description}
                            </Text>
                          </Card>
                        </BlockStack>
                      </Card>

                      <Card padding="300" width="400px">
                        <BlockStack gap="300">
                          <Box paddingBlockStart="200" paddingBlockEnd="200">
                            <RadioButton
                              label={<Text variant="bodyMd">Modern</Text>}
                              checked={selected === "modern"}
                              onChange={() => setSelected("modern")}
                            />
                          </Box>
                          <Card background="bg-fill-secondary" padding="300">
                            <Text variant="bodyMd" as="p">
                              {content.init_form.step3_option_2_description}
                            </Text>
                          </Card>
                        </BlockStack>
                      </Card>
                    </BlockStack>
                  </FormLayout>
                </BlockStack>
              </Card>
            )}

          {/* Step 4 */}
          {currentStep === 4 && (
            <Card padding="400" roundedAbove="sm">
              <BlockStack gap="400" alignment="center">
                <Text variant="heading2xl" as="h1" fontWeight="bold" alignment="center">
                  {content.init_form.step4_heading_1}
                </Text>
                <Text variant="bodyLg" as="p" alignment="center">
                  {content.init_form.step4_description_1}
                </Text>
                <BlockStack gap="300">
                  <Button variant="primary" size="medium" width="100px">{content.init_form.step4_option_1}
                  </Button>
                  <Button variant="tertiary" size="medium">{content.init_form.step4_option_2}</Button>
                </BlockStack>
              </BlockStack>
            </Card>
          )}

          {/* Navigation Buttons */}
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              {currentStep > 1 && (
                <Button 
                  variant="tertiary"
                  size="medium"
                  onClick={handlePrevious}
                >
                  Previous
                </Button>
              )}
              {currentStep < totalSteps && (
                <Button
                  variant="primary"
                  size="medium"
                  onClick={handleNext}
                >
                  {currentStep === totalSteps - 1 ? 'Get Started' : 'Continue'}
                </Button>
              )}
            </InlineStack>
          </BlockStack>
        </BlockStack>
      </Card>
    </Page>
  );
}