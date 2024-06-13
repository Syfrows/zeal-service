import { Injectable } from "@nestjs/common";
import {
  TransactionalConnection,
  ListQueryBuilder,
  ProductPriceApplicator,
  TranslatorService,
  RequestContext,
  ID,
  ListQueryOptions,
  ProductVariant,
  RelationPaths,
  PaginatedList,
  Translated,
  Order,
} from "@vendure/core";
import { unique } from "@vendure/common/lib/unique";

@Injectable()
export class CustomProductVariantService {
  constructor(
    private connection: TransactionalConnection,
    private listQueryBuilder: ListQueryBuilder,
    private productPriceApplicator: ProductPriceApplicator,
    private translator: TranslatorService
  ) {}

  getVariantsByCollectionId(
    ctx: RequestContext,
    collectionId: ID,
    options: ListQueryOptions<ProductVariant>,
    relations: RelationPaths<ProductVariant> = [],
    collectionSlug?: string
  ): Promise<PaginatedList<Translated<ProductVariant>>> {
    const subQuery = this.connection
      .getRepository(ctx, ProductVariant)
      .createQueryBuilder("productvariant")
      .select("MIN(productvariant.id) as id")
      .where("productvariant.deletedAt IS NULL")
      .groupBy("productvariant.productId");

    const qb = this.listQueryBuilder
      .build(ProductVariant, options, {
        relations: unique([...relations, "taxCategory"]),
        channelId: ctx.channelId,
        ctx,
      })
      .leftJoin("productvariant.product", "product")
      .andWhere("product.deletedAt IS NULL")
      .andWhere("productvariant.deletedAt IS NULL")
      .andWhere(
        `productvariant.id IN (${subQuery.getQuery()})`,
        subQuery.getParameters()
      );

    if (collectionSlug && collectionSlug !== "all") {
      qb.leftJoin("productvariant.collections", "collection").andWhere(
        "collection.id = :collectionId",
        { collectionId }
      );
    }

    if (
      options &&
      options.filter &&
      options.filter.enabled &&
      options.filter.enabled.eq === true
    ) {
      qb.andWhere("product.enabled = :enabled", { enabled: true });
    }

    return qb.getManyAndCount().then(async ([variants, totalItems]) => {
      const items = await this.applyPricesAndTranslateVariants(ctx, variants);
      return {
        items,
        totalItems,
      };
    });
  }

  private async applyPricesAndTranslateVariants(
    ctx: RequestContext,
    variants: ProductVariant[]
  ): Promise<Array<Translated<ProductVariant>>> {
    return await Promise.all(
      variants.map(async (variant) => {
        const variantWithPrices = await this.applyChannelPriceAndTax(
          variant,
          ctx
        );
        return this.translator.translate(variantWithPrices, ctx, [
          "options",
          "facetValues",
          ["facetValues", "facet"],
        ]);
      })
    );
  }

  async applyChannelPriceAndTax(
    variant: ProductVariant,
    ctx: RequestContext,
    order?: Order
  ): Promise<ProductVariant> {
    return this.productPriceApplicator.applyChannelPriceAndTax(
      variant,
      ctx,
      order
    );
  }
}
