const { Asset, AssetType, ChannelService, LanguageCode, Product, ProductOptionGroupService, ProductOptionService, ProductService, ProductVariant, ProductVariantService, RequestContextService, TransactionalConnection } = require("@vendure/core");
const { GlobalFlag } = require("@vendure/common/lib/generated-types");
const fs = require("fs");
const path = require("path");
const entries = require("./colorways.json");

module.exports = async function installColorways(app) {
  const db = app.get(TransactionalConnection);
  const variants = app.get(ProductVariantService);
  const options = app.get(ProductOptionService);
  const admin = await app.get(RequestContextService).create({ apiType: "admin" });
  const translate = name => [{ languageCode: LanguageCode.en, name }];
  for (const entry of entries) {
    await db.withTransaction(admin, async ctx => {
      const repo = db.getRepository(ctx, ProductVariant);
      const base = await repo.findOne({ where: { sku: entry.sku }, relations: ["collections", "product", "taxCategory"] });
      if (!base) return;
      await db.getRepository(ctx, Product).findOneOrFail({ where: { id: base.product.id }, lock: { mode: "pessimistic_write" } });
      const product = await app.get(ProductService).findOne(ctx, base.product.id, ["optionGroups"]);
      if (!product || product.optionGroups.length) return;
      const priced = await variants.findOne(ctx, base.id);
      const group = await app.get(ProductOptionGroupService).create(ctx, {
        code: entry.slug + "-color", translations: translate("Color"), options: [],
      });
      await app.get(ProductService).addOptionGroupToProduct(ctx, product.id, group.id);
      const original = await options.create(ctx, group.id, { code: "original", translations: translate("Original") });
      await variants.update(ctx, [{ id: base.id, optionIds: [original.id] }]);
      for (const color of entry.colors) {
        const code = color.toLowerCase();
        const name = entry.slug + "-" + code + ".webp";
        const relative = "colourways/" + name;
        const asset = new Asset({ name, type: AssetType.IMAGE, mimeType: "image/webp", width: 512, height: 512,
          fileSize: fs.statSync(path.resolve("dist/static/assets", relative)).size, source: relative, preview: relative });
        await app.get(ChannelService).assignToCurrentChannel(asset, ctx);
        await db.getRepository(ctx, Asset).save(asset);
        const option = await options.create(ctx, group.id, { code, translations: translate(color) });
        const [variant] = await variants.create(ctx, [{ productId: product.id, sku: entry.sku + "-" + code.toUpperCase(),
          translations: translate(product.name + " – " + color), price: priced.price, taxCategoryId: base.taxCategory.id,
          optionIds: [option.id], featuredAssetId: asset.id, assetIds: [asset.id], stockOnHand: 0, trackInventory: GlobalFlag.TRUE }]);
        if (base.collections.length) {
          await repo.createQueryBuilder().relation(ProductVariant, "collections").of(variant.id).add(base.collections.map(c => c.id));
        }
      }
    });
  }
};
