import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  DeliveryMethod,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

import { createTable } from "./db/create_table";
import { saveStoreData } from "./models/saveStoreData.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October24,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: `${process.env.SHOPIFY_APP_URL}/webhooks/app/uninstalled`,
      callback: async (topic, shop, body, wehbooksId) => {
        const payload = JSON.parse(body);
        console.log(`${shop}: App uninstalled suucessfully`)
      }
    },
    CUSTOMERs_DATA_REQUEST: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: `${process.env.SHOPIFY_APP_URL}/webhooks/customers/data_request`,
      callback: async (topic, shop, body, wehbooksId) => {
        const payload = JSON.parse(body);
        console.log(`${shop}: Customer Data Request is done.`)
      }
    },
    CUSTOMERS_REDACT: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: `${process.env.SHOPIFY_APP_URL}/webhooks/customers/redact`,
      callback: async (topic, shop, body, wehbooksId) => {
        const payload = JSON.parse(body);
        console.log(`${shop}: customer redact webhooks response is done`)
      }
    },
    SHOP_REDACT: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: `${process.env.SHOPIFY_APP_URL}/webhooks/shop/redact`,
      callback: async (topic, shop, body, wehbooksId) => {
        const payload = JSON.parse(body);
        console.log(`${shop}: shop data response is done.`)
      }
    },
  },
  hooks:{

    afterAuth: async ({session, admin}) => {
      console.log('after auth is triggered.....')
      shopify.registerWebhooks({session})
      try {
        await createTable(admin);
        await saveStoreData(admin);
      } catch (error) {
        console.error("Error during afterAuth:", error);
      }
    }
  },
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});



export default shopify;
export const apiVersion = ApiVersion.October24;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
