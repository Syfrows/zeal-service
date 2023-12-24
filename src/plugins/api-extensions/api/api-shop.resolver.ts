import {
  CollectionService,
  RequestContext,
  Collection,
  RelationPaths,
  Translated,
  UserInputError,
  Ctx,
  Relations,
  Allow,
  Customer,
  CustomerService,
  Permission,
  ACTIVE_ORDER_INPUT_FIELD_NAME,
  Order,
  ActiveOrderService,
  OrderService,
} from "@vendure/core";
import { QueryCollectionArgs } from "src/plugins/reviews/generated-shop-types";
import { Args, Resolver, Query } from "@nestjs/graphql";

type ActiveOrderArgs = { [ACTIVE_ORDER_INPUT_FIELD_NAME]?: any };

@Resolver()
export class ShopApiExtensionResolver {
  constructor(
    private collectionService: CollectionService,
    private customerService: CustomerService,
    private orderService: OrderService,
    private activeOrderService: ActiveOrderService
  ) {}

  @Query()
  async productsByCollection(
    @Ctx() ctx: RequestContext,
    @Args() args: QueryCollectionArgs,
    @Relations({
      entity: Collection,
      omit: [
        "productVariants",
        "assets",
        "parent.productVariants",
        "children.productVariants",
      ],
    })
    relations: RelationPaths<Collection>
  ): Promise<Translated<Collection> | undefined> {
    let collection: Translated<Collection> | undefined;
    if (args.id) {
      collection = await this.collectionService.findOne(
        ctx,
        args.id,
        relations
      );
      if (args.slug && collection && collection.slug !== args.slug) {
        throw new UserInputError("error.collection-id-slug-mismatch");
      }
    } else if (args.slug) {
      collection = await this.collectionService.findOneBySlug(
        ctx,
        args.slug,
        relations
      );
    } else {
      throw new UserInputError("error.collection-id-or-slug-must-be-provided");
    }
    if (collection && collection.isPrivate) {
      return;
    }
    return collection;
  }

  @Query()
  @Allow(Permission.Authenticated)
  async authenticatedUser(
    @Ctx() ctx: RequestContext
  ): Promise<Customer | undefined> {
    const userId = ctx.activeUserId;
    if (userId) {
      return this.customerService.findOneByUserId(ctx, userId);
    }
  }

  @Query()
  @Allow(Permission.Authenticated)
  async activeOrderCustom(
    @Ctx() ctx: RequestContext,
    @Relations(Order) relations: RelationPaths<Order>,
    @Args() args: ActiveOrderArgs
  ): Promise<Order | undefined> {
    const sessionOrder = await this.activeOrderService.getActiveOrder(
      ctx,
      args[ACTIVE_ORDER_INPUT_FIELD_NAME]
    );
    if (sessionOrder) {
      return this.orderService.findOne(ctx, sessionOrder.id);
    } else {
      return;
    }
  }
}
