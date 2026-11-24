import {
  DefaultJobQueuePlugin,
  DefaultSearchPlugin,
  dummyPaymentHandler,
  VendureConfig,
  NativeAuthenticationStrategy,
} from "@vendure/core";
import { passwordResetHandler, EmailPlugin } from "@vendure/email-plugin";
import { AssetServerPlugin } from "@vendure/asset-server-plugin";
import { AdminUiPlugin } from "@vendure/admin-ui-plugin";
import "dotenv/config";
import path from "path";
import { ReviewsPlugin } from "./plugins/reviews/reviews-plugin";
import { DashboardMetricsPlugin } from "./plugins/dashboard-metrics";
import { FavoritesPlugin } from "./plugins/favorites/plugin";
import { RazorpayPlugin } from "vendure-razorpay-payment-plugin";
import { APIExtensionPlugin } from "./plugins/api-extensions/plugin";
import { GoogleAuthenticationStrategy } from "./plugins/authentication/google-authentication-strategy";
import { orderPlacedHandler } from "./email-handler";
import { InvoicePlugin } from "@pinelab/vendure-plugin-invoices";
import { pinCodeChecker } from "./shipping-methods/pincode-checker";
import { shippingCostCalculator } from "./shipping-methods/shipping-calculator";
import { shiprocketFulfillmentHandler } from "./shiprocket-fulfillment-handler";
import { EventHandlerPlugin } from "./plugins/event-handler/event-handler-plugin";

const IS_DEV = process.env.APP_ENV === "dev";

let customAdminUi: any = null;
if (IS_DEV) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const module = require("./compile-admin-ui");
  customAdminUi = module.customAdminUi;
}

export const config: VendureConfig = {
  apiOptions: {
    port: 3000,
    adminApiPath: "admin-api",
    shopApiPath: "shop-api",
    // The following options are useful in development mode,
    // but are best turned off for production for security
    // reasons.
    ...(IS_DEV
      ? {
          adminApiPlayground: {
            settings: { "request.credentials": "include" } as any,
          },
          adminApiDebug: true,
          shopApiPlayground: {
            settings: { "request.credentials": "include" } as any,
          },
          shopApiDebug: true,
        }
      : {}),
  },
  authOptions: {
    shopAuthenticationStrategy: [
      new NativeAuthenticationStrategy(),
      new GoogleAuthenticationStrategy(process.env.GOOGLE_CLIENT_ID || ""),
    ],
    tokenMethod: ["bearer", "cookie"],
    superadminCredentials: {
      identifier: process.env.SUPERADMIN_USERNAME || "",
      password: process.env.SUPERADMIN_PASSWORD || "",
    },
    cookieOptions: {
      secret: process.env.COOKIE_SECRET,
    },
    requireVerification: false,
  },
  dbConnectionOptions: {
    type: "mysql",
    // See the README.md "Migrations" section for an explanation of
    // the `synchronize` and `migrations` options.
    synchronize: false,
    migrations: [path.join(__dirname, "./migrations/*.+(js|ts)")],
    logging: false,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  },

  paymentOptions: {
    paymentMethodHandlers: [dummyPaymentHandler],
  },
  shippingOptions: {
    shippingEligibilityCheckers: [pinCodeChecker],
    shippingCalculators: [shippingCostCalculator],
    fulfillmentHandlers: [shiprocketFulfillmentHandler],
  },
  // When adding or altering custom field definitions, the database will
  // need to be updated. See the "Migrations" section in README.md.
  customFields: {
    Product: [
      {
        name: "Info",
        type: "text",
        ui: { component: "rich-text-form-input" },
      },
    ],
    ProductVariant: [
      {
        name: "MRP",
        type: "int",
        ui: { component: "currency-form-input" },
      },
    ],
    Collection: [
      {
        name: "Category",
        type: "boolean",
      },
      {
        name: "OnlyFilter",
        type: "boolean",
      },
    ],
    ShippingMethod: [
      {
        name: "length",
        type: "float",
        ui: { component: "number-form-input", suffix: "cms" },
      },
      {
        name: "breadth",
        type: "float",
        ui: { component: "number-form-input", suffix: "cms" },
      },
      {
        name: "height",
        type: "float",
        ui: { component: "number-form-input", suffix: "cms" },
      },
      {
        name: "weight",
        type: "float",
        ui: { component: "number-form-input", suffix: "kgs" },
      },
      {
        name: "pickupLocation",
        type: "text",
        ui: { component: "form-input" },
      },
    ],
  },
  plugins: [
    AssetServerPlugin.init({
      route: "assets",
      assetUploadDir: path.join(__dirname, "../static/assets"),
      // For local dev, the correct value for assetUrLlPrefix should
      // be guessed correctly, but for production it will usually need
      // to be set manually to match your production url.
      assetUrlPrefix: IS_DEV ? undefined : "https://api.relaxzeal.com/assets/",
    }),
    DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
    DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
    EmailPlugin.init({
      ...(IS_DEV ? { devMode: true } : {}),
      outputPath: path.join(__dirname, "../static/email/test-emails"),
      route: "mailbox",
      handlers: [orderPlacedHandler, passwordResetHandler],
      templatePath: path.join(__dirname, "../static/email/templates"),
      transport: {
        type: "smtp",
        host: "mail.relaxzeal.com",
        port: 465,
        auth: {
          user: "noreply@relaxzeal.com",
          pass: process.env.SMTP_PASS,
        },
      },
      globalTemplateVars: {
        // The following variables will change depending on your storefront implementation.
        // Here we are assuming a storefront running at http://localhost:8080.
        fromAddress: '"Zeal" <noreply@relaxzeal.com>',
        verifyEmailAddressUrl: "http://localhost:8080/verify",
        passwordResetUrl: IS_DEV ? "http://localhost:3000/password-reset" : "https://zeal.relaxzeal.com/password-reset",
        changeEmailAddressUrl:
          "http://localhost:8080/verify-email-address-change",
      },
    }),
    ...(IS_DEV
      ? [
          AdminUiPlugin.init({
            route: "admin",
            port: 3002,
            adminUiConfig: {
              apiHost: "http://localhost",
              apiPort: 3000,
              brand: "Zeal",
              hideVendureBranding: true,
            },
            app: customAdminUi({ recompile: IS_DEV, devMode: IS_DEV }),
          }),
        ]
      : [DashboardMetricsPlugin]),
    ReviewsPlugin,
    FavoritesPlugin,
    RazorpayPlugin,
    APIExtensionPlugin,
    InvoicePlugin.init({
      vendureHost: IS_DEV
        ? "http://localhost:3000"
        : "https://api.relaxzeal.com",
    }),
    EventHandlerPlugin,
  ],
};
