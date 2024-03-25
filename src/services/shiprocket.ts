import axios, { AxiosError } from "axios";

export interface ShipmentDetails {
  mode: string;
  order_id: string;
  order_date: string;
  billing_customer_name: string;
  billing_last_name: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_country: string;
  billing_pincode: number;
  billing_email: string;
  billing_phone: number;
  shipping_is_billing: boolean;
  order_items: Array<ShipmentOrderItem>;
  payment_method: string;
  sub_total: number;
  length: number;
  breadth: number;
  height: number;
  weight: number;
  pickup_location: string;
}

interface ShipmentOrderItem {
  name: string;
  sku: string;
  units: number;
  selling_price: string;
}

const shiprocketInstance = axios.create({
  baseURL: process.env.SHIPROCKET_BASE_URL,
});

shiprocketInstance.interceptors.response.use(
  undefined,
  async (error: AxiosError) => {
    const statusCode = error.response?.status;
    if (statusCode === 401) {
      await getAuthToken();
      const config = error.config as any;
      return await shiprocketInstance.request(config);
    }
    return Promise.reject(error);
  }
);

const getAuthToken = async () => {
  const response = await shiprocketInstance.post("auth/login", {
    email: process.env.SHIPROCKET_API_USER_EMAIL,
    password: process.env.SHIPROCKET_API_USER_PASS,
  });
  const authToken = response?.data?.token ?? "";
  shiprocketInstance.defaults.headers.common[
    "Authorization"
  ] = `Bearer ${authToken}`;
  return authToken;
};

export const getPickUpPincode = async () => {
  const response = await shiprocketInstance.get("settings/company/pickup");
  const firstShippingAddress = response?.data?.data?.shipping_address[0];
  return Number(firstShippingAddress?.pin_code || 0);
};

export const isPincodeServiceable = async (deliveryPincode: number) => {
  const pickUpPincode = await getPickUpPincode();
  const response = await shiprocketInstance.get(
    `courier/serviceability?pickup_postcode=${pickUpPincode}&delivery_postcode=${deliveryPincode}&cod=${1}&weight=1`
  );
  const availableCouriers = response?.data?.data?.available_courier_companies;
  return availableCouriers?.length > 0;
};

export const createFulfillmentViaShiprocket = async (
  shipmentDetails: ShipmentDetails
) => {
  const response = await shiprocketInstance.post(
    "shipments/create/forward-shipment",
    shipmentDetails
  );
  const data = response?.data?.payload;
  return {
    method: `Shiprocket ${data.courier_name}`,
    trackingCode: data.awb_code,
    customFields: {
      labelUrl: data.label_url,
      manifestUrl: data.manifest_url,
      orderId: data.order_id,
      shipmentId: data.shipment_id,
    },
  };
};
