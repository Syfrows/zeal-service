const { Asset, AssetType, ChannelService, Collection, CollectionService, LanguageCode, ProductOptionGroupService, ProductOptionService, ProductService, ProductVariant, ProductVariantService, RequestContextService, TransactionalConnection } = require("@vendure/core");
const { GlobalFlag } = require("@vendure/common/lib/generated-types");
const fs = require("fs");
const path = require("path");

const products = [
  ...require("./apparel.json"),
  { name: "Pool Slides", slug: "pool-slides", sku: "ZL-FW-SL", category: "footwear", price: 69900, description: "Slip-on slides for the locker room or poolside.", colors: ["Black", "Sand"] },
  { name: "Training Towel", slug: "training-towel", sku: "ZL-AC-TW", category: "accessories", price: 29900, description: "A workout towel for your gym bag.", colors: ["Blue", "Green"] },
];

module.exports = async function installCategoryProducts(app) {
  const db = app.get(TransactionalConnection);
  const ctx = await app.get(RequestContextService).create({ apiType: "admin" });
  for (const item of products) {
    await db.withTransaction(ctx, async tx => {
      const collections = app.get(CollectionService);
      const all = await collections.findOneBySlug(tx, "all");
      const category = await collections.findOneBySlug(tx, item.category);
      if (!all || !category) throw new Error("Missing catalog collection for " + item.slug);
      await db.getRepository(tx, Collection).findOneOrFail({ where: { id: all.id }, lock: { mode: "pessimistic_write" } });
      const repo = db.getRepository(tx, ProductVariant);
      const choices = item.sizes || item.colors;
      if (await repo.findOne({ where: { sku: item.sku + "-" + choices[0].toUpperCase() }, withDeleted: true })) return;
      const taxSource = await repo.findOneOrFail({ where: { sku: item.sizes ? "ZL-MT-001" : item.category === "footwear" ? "ZL-FW-001" : "ZL-AC-001" }, relations: ["taxCategory"] });
      const assets = [];
      const imageNames = item.sizes ? [item.slug + ".webp"] : item.colors.map(c => item.slug + "-" + c.toLowerCase() + ".webp");
      for (const name of imageNames) {
        const file = "colourways/" + name;
        const asset = new Asset({ name, type: AssetType.IMAGE, mimeType: "image/webp", width: 512, height: 512,
          source: file, preview: file, fileSize: fs.statSync(path.resolve("dist/static/assets", file)).size });
        await app.get(ChannelService).assignToCurrentChannel(asset, tx);
        assets.push(await db.getRepository(tx, Asset).save(asset));
      }
      const productService = app.get(ProductService);
      const lang = LanguageCode.en;
      const product = await productService.create(tx, { featuredAssetId: assets[0].id, assetIds: assets.map(a => a.id),
        translations: [{ languageCode: lang, name: item.name, slug: item.slug, description: item.description }] });
      const group = await app.get(ProductOptionGroupService).create(tx, { code: item.slug + (item.sizes ? "-size" : "-color"), translations: [{ languageCode: lang, name: item.sizes ? "Size" : "Color" }], options: [] });
      await productService.addOptionGroupToProduct(tx, product.id, group.id);
      const variants = [];
      for (const [i, choice] of choices.entries()) {
        const asset = item.sizes ? assets[0] : assets[i];
        const option = await app.get(ProductOptionService).create(tx, group.id, { code: choice.toLowerCase(), translations: [{ languageCode: lang, name: choice }] });
        const [variant] = await app.get(ProductVariantService).create(tx, [{ productId: product.id,
          translations: [{ languageCode: lang, name: item.name + " – " + choice }], sku: item.sku + "-" + choice.toUpperCase(),
          price: item.price, taxCategoryId: taxSource.taxCategory.id, optionIds: [option.id], assetIds: [asset.id], featuredAssetId: asset.id,
          stockOnHand: 0, trackInventory: GlobalFlag.TRUE }]);
        variants.push(variant);
      }
      for (const collectionId of [all.id, category.id]) {
        const collection = await db.getRepository(tx, Collection).findOneOrFail({ where: { id: collectionId }, lock: { mode: "pessimistic_write" } });
        const arg = collection.filters.find(f => f.code === "product-id-filter")?.args.find(a => a.name === "productIds");
        if (!arg) throw new Error("Missing product filter on collection " + collectionId);
        arg.value = JSON.stringify([...new Set([...JSON.parse(arg.value), String(product.id)])]);
        await db.getRepository(tx, Collection).save(collection);
        for (const v of variants) await repo.createQueryBuilder().relation(ProductVariant, "collections").of(v.id).add(collection.id);
      }
    });
  }
};
