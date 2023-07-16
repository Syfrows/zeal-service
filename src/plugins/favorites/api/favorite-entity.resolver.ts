import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { InjectConnection } from "@nestjs/typeorm";
import {
  Ctx,
  Customer,
  RequestContext,
  translateDeep,
  ProductVariant,
} from "@vendure/core";
import { Connection } from "typeorm";

import { Favorite } from "../entities/favorite.entity";

@Resolver("Favorite")
export class FavoriteEntityResolver {
  constructor(@InjectConnection() private connection: Connection) {}

  @ResolveField()
  async product(@Parent() favorite: Favorite, @Ctx() ctx: RequestContext) {
    let productVariant: ProductVariant | null = favorite.productVariant;
    if (!productVariant) {
      const favoriteWithProduct = await this.connection
        .getRepository(Favorite)
        .findOne({
          where: { id: favorite.id },
          relations: ["productVariant"],
        });
      if (favoriteWithProduct) {
        productVariant = favoriteWithProduct.productVariant;
      }
    }
    if (productVariant) {
      return translateDeep(productVariant, ctx.languageCode);
    }
  }

  @ResolveField()
  async customer(@Parent() favorite: Favorite, @Ctx() ctx: RequestContext) {
    let customer: Customer | null = favorite.customer;
    if (!customer) {
      const favoriteWithCustomer = await this.connection
        .getRepository(Favorite)
        .findOne({
          where: { id: favorite.id },
          relations: ["customer"],
        });
      if (favoriteWithCustomer) {
        customer = favoriteWithCustomer.customer;
      }
    }
    return customer;
  }
}
