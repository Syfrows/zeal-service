import { PluginCommonModule, VendurePlugin } from "@vendure/core";
import { shopApiExtensions } from "./api/api-extensions";
import { ShopApiExtensionResolver } from "./api/api-shop.resolver";
import { CollectionEntityResolver } from "./api/collection-entity.resolver";
import { CustomProductVariantService } from "./service/product-variant.service";

@VendurePlugin({
  imports: [PluginCommonModule],
  shopApiExtensions: {
    schema: shopApiExtensions,
    resolvers: [ShopApiExtensionResolver, CollectionEntityResolver],
  },
  providers: [CustomProductVariantService],
})
export class APIExtensionPlugin {}
