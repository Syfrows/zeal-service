import { LanguageCode, ShippingEligibilityChecker } from "@vendure/core";
import { isPincodeServiceable } from "../services/shiprocket";

export const pinCodeChecker = new ShippingEligibilityChecker({
  code: "pincode-checker",
  description: [
    { languageCode: LanguageCode.en, value: "Serviceable Pincode Checker" },
  ],
  args: {},

  check: async (ctx, order, args) => {
    const pincode = Number(order?.shippingAddress?.postalCode || 0);
    const isPincodeServiceableValue = await isPincodeServiceable(pincode);
    return isPincodeServiceableValue;
  },
});
