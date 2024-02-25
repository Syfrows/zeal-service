import { OrderPlacedEvent } from "@vendure/core";
import { EmailEventListener } from "@vendure/email-plugin";

export const orderPlacedHandler = new EmailEventListener("order-placed")
  .on(OrderPlacedEvent)
  .setFrom("{{ fromAddress }}")
  .setRecipient((_event) => process.env.UPDATES_TO_EMAIL || "")
  .setSubject(`New Order Placed - #{{ order.code }}`)
  .setTemplateVars((event) => ({ order: event.order }));
