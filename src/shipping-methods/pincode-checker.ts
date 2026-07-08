import { LanguageCode, ShippingEligibilityChecker } from "@vendure/core";
import { isPincodeServiceable } from "../services/shiprocket";

export const pinCodeChecker = new ShippingEligibilityChecker({
    code: "pincode-checker",
    description: [
      { languageCode: LanguageCode.en, value: "Serviceable Pincode Checker" },
        ],
    args: {},

    check: async (ctx, order, args) => {
          if (!process.env.SHIPROCKET_BASE_URL) {
                  return true;
          }
          try {
                  const pincode = Number(order?.shippingAddress?.postalCode || 0);
                  const isPincodeServiceableValue = await isPincodeServiceable(pincode);
                  return isPincodeServiceableValue;
          } catch (e) {
                  return true;
          }
    },
});
