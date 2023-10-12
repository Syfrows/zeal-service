import {
  RequestContext,
  Collection,
  RelationPaths,
  Translated,
  Ctx,
  Relations,
  Api,
  ApiType,
  ListQueryOptions,
  PaginatedList,
  Product,
  ProductVariant,
  ProductVariantService,
} from "@vendure/core";
import { Args, Resolver, ResolveField, Parent } from "@nestjs/graphql";
import { ProductVariantListOptions } from "src/plugins/reviews/generated-shop-types";
import { CustomProductVariantService } from "../service/product-variant.service";

@Resolver("Collection")
export class CollectionEntityResolver {
  constructor(
    private customProductVariantService: CustomProductVariantService,
    private productVariantService: ProductVariantService
  ) {}

  @ResolveField()
  async productVariants(
    @Ctx() ctx: RequestContext,
    @Parent() collection: Collection,
    @Args() args: { options: ProductVariantListOptions },
    @Api() apiType: ApiType,
    @Relations({ entity: ProductVariant, omit: ["assets"] })
    relations: RelationPaths<ProductVariant>
  ): Promise<PaginatedList<Translated<ProductVariant>>> {
    let options: ListQueryOptions<Product> = args.options;
    if (apiType === "shop") {
      options = {
        ...args.options,
        filter: {
          ...(args.options ? args.options.filter : {}),
          enabled: { eq: true },
        },
      };
    }
    return ctx.req?.body?.operationName === "getProductsByCollectionCustom"
      ? this.customProductVariantService.getVariantsByCollectionId(
          ctx,
          collection.id,
          options,
          relations,
          collection.slug
        )
      : this.productVariantService.getVariantsByCollectionId(
          ctx,
          collection.id,
          options,
          relations
        );
  }
}
