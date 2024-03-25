import { OnModuleInit } from "@nestjs/common";
import {
  EventBus,
  OrderPlacedEvent,
  PluginCommonModule,
  VendurePlugin,
  OrderService,
} from "@vendure/core";

@VendurePlugin({
  imports: [PluginCommonModule],
})
export class EventHandlerPlugin implements OnModuleInit {
  constructor(private eventBus: EventBus, private orderService: OrderService) {}

  onModuleInit() {
    this.eventBus.ofType(OrderPlacedEvent).subscribe((event) => {
      const { ctx, order } = event;
      const lines = order.lines.map((x) => ({
        orderLineId: x.id,
        quantity: x.quantity,
      }));
      this.orderService.createFulfillment(ctx, {
        handler: {
          code: "shiprocket",
          arguments: [],
        },
        lines: lines,
      });
    });
  }
}
