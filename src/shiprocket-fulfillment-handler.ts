import {
  FulfillmentHandler,
  Injector,
  LanguageCode,
  ShippingMethodService,
  OrderService,
  CustomerService,
} from "@vendure/core";
import {
  ShipmentDetails,
  createFulfillmentViaShiprocket,
} from "./services/shiprocket";

let shippingMethodService: ShippingMethodService;
let orderService: OrderService;
let customerService: CustomerService;

export const shiprocketFulfillmentHandler = new FulfillmentHandler({
  code: "shiprocket",
  description: [
    {
      languageCode: LanguageCode.en,
      value: "Generate tracking codes via the ShipRocket API",
    },
  ],

  args: {},

  init: (injector: Injector) => {
    shippingMethodService = injector.get(ShippingMethodService);
    orderService = injector.get(OrderService);
    customerService = injector.get(CustomerService);
  },

  createFulfillment: async (ctx, orders, lines, args) => {
    const orderId = orders[0].id;
    const order = (await orderService.findOne(ctx, orderId)) || orders[0];
    const address = order.shippingAddress;
    const shippingMethods = await shippingMethodService.findAll(ctx);
    const standardShipping = shippingMethods.items.find(
      (x) => x.code === "standard-shipping"
    )?.customFields as any;
    const orderPayments = await orderService.getOrderPayments(ctx, orderId);
    const paymentMethod =
      orderPayments[0]?.method?.trim() === "cash-on-delivery"
        ? "COD"
        : "Prepaid";
    const customer = await customerService.findOne(ctx, order.customerId || 0);

    const shipmentDetails: ShipmentDetails = {
      mode: "Surface",
      order_id: order.id.toString(),
      order_date: (order.orderPlacedAt || new Date()).toLocaleDateString(),
      billing_customer_name:
        address.fullName?.split(" ")[0] || address.fullName || "",
      billing_last_name: address.fullName?.split(" ")[1] || "",
      billing_address: [address.streetLine1, address.streetLine2].join(", "),
      billing_city: address.city || "",
      billing_state: address.province || "",
      billing_country: address.country || "",
      billing_pincode: Number(address.postalCode),
      billing_email: customer?.emailAddress || "",
      billing_phone: Number(address.phoneNumber?.slice(-10)),
      shipping_is_billing: true,
      order_items: order?.lines?.map((line) => ({
        name: line.productVariant.name,
        units: line.quantity,
        sku: line.productVariant.sku,
        selling_price: line.linePriceWithTax.toString(),
      })),
      payment_method: paymentMethod,
      sub_total: order.subTotalWithTax,
      length: standardShipping.length,
      breadth: standardShipping.breadth,
      height: standardShipping.height,
      weight: standardShipping.weight,
      pickup_location: standardShipping.pickupLocation,
    };

    try {
      const data = await createFulfillmentViaShiprocket(shipmentDetails);
      return data;
    } catch (error: any) {
      console.error(
        `error while creating fulfillment for orderId : ${orderId}, orderCode : ${order.code} `,
        error.response.data
      );
      throw error;
    }
  },
});
