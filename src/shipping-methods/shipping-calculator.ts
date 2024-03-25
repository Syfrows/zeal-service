import { LanguageCode, ShippingCalculator } from "@vendure/core";

export const shippingCostCalculator = new ShippingCalculator({
  code: "shipping-cost-calculator",
  description: [
    { languageCode: LanguageCode.en, value: "Calculates shipping cost" },
  ],
  args: {
    rate: {
      type: "int",
      ui: { component: "currency-form-input" },
      label: [{ languageCode: LanguageCode.en, value: "Rate" }],
    },
    freeAbove: {
      type: "int",
      ui: { component: "currency-form-input" },
      label: [{ languageCode: LanguageCode.en, value: "Free Above" }],
    },
    taxRate: {
      type: "int",
      ui: { component: "number-form-input", suffix: "%" },
      label: [{ languageCode: LanguageCode.en, value: "Tax Rate" }],
    },
  },
  calculate: async (ctx, order, args) => {
    const price = order.subTotalWithTax >= args.freeAbove ? 0 : args.rate;
    return {
      price: price,
      priceIncludesTax: ctx.channel.pricesIncludeTax,
      taxRate: args.taxRate,
    };
  },
});
