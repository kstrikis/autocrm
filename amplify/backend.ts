import { defineBackend } from '@aws-amplify/backend';
import { Stack } from "aws-cdk-lib";
import {
  AuthorizationType,
  Cors,
  LambdaIntegration,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";

import { auth } from './auth/resource';
import { data } from './data/resource';

const backend = defineBackend({
  auth,
  data,
});

// Create API stack
const apiStack = backend.createStack("crm-api-stack");

// Create REST API
const crmApi = new RestApi(apiStack, "CrmApi", {
  restApiName: "crm-api",
  deploy: true,
  deployOptions: {
    stageName: process.env.NODE_ENV === "development" ? "dev" : "prod",
  },
  defaultCorsPreflightOptions: {
    allowOrigins: [
      process.env.NODE_ENV === "development" 
        ? "http://localhost:5173"
        : "*" // TODO: Replace with your production domain
    ],
    allowMethods: Cors.ALL_METHODS,
    allowHeaders: [
      "Content-Type",
      "X-Amz-Date",
      "Authorization",
      "X-Api-Key",
      "X-Amz-Security-Token"
    ],
  },
});

// Add outputs
backend.addOutput({
  custom: {
    API: {
      [crmApi.restApiName]: {
        endpoint: crmApi.url,
        region: Stack.of(crmApi).region,
        apiName: crmApi.restApiName,
      },
    },
  },
});
