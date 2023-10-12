import {
  CollectionService,
  RequestContext,
  Collection,
  RelationPaths,
  Translated,
  UserInputError,
  Ctx,
  Relations,
} from "@vendure/core";
import { QueryCollectionArgs } from "src/plugins/reviews/generated-shop-types";
import { Args, Resolver, Query } from "@nestjs/graphql";

@Resolver()
export class ShopApiExtensionResolver {
  constructor(private collectionService: CollectionService) {}

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
}
