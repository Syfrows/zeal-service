const { Collection, CollectionService, ProductService, RequestContextService, TransactionalConnection, LanguageCode } = require("@vendure/core");

const types = {
  Shirts: ["mens-performance-tshirt", "training-polo", "long-sleeve-crew-shirt"],
  Shorts: ["mens-training-shorts", "split-running-shorts", "cycling-shorts"],
  Jackets: ["mens-track-jacket", "hooded-windbreaker", "quilted-vest-jacket"],
  Pants: ["womens-yoga-leggings", "tapered-joggers", "straight-track-pants"],
  "Workout Tops": ["womens-sports-bra", "womens-running-tank", "racerback-crop-top"],
};

module.exports = async function installProductTypes(app) {
  const collections = app.get(CollectionService);
  const products = app.get(ProductService);
  const db = app.get(TransactionalConnection);
  const ctx = await app.get(RequestContextService).create({ apiType: "admin" });
  const all = await collections.findOneBySlug(ctx, "all");
  for (const [name, slugs] of Object.entries(types)) {
    await db.withTransaction(ctx, async tx => {
      await db.getRepository(tx, Collection).findOneOrFail({ where: { id: all.id }, lock: { mode: "pessimistic_write" } });
      const slug = name.toLowerCase().replace(/ /g, "-");
      if (await collections.findOneBySlug(tx, slug)) return;
      const ids = [];
      for (const productSlug of slugs) {
        const product = await products.findOneBySlug(tx, productSlug);
        if (!product) throw new Error("Missing style " + productSlug);
        ids.push(String(product.id));
      }
      await collections.create(tx, {
        translations: [{ languageCode: LanguageCode.en, name, slug, description: "" }],
        customFields: { Category: true, OnlyFilter: true },
        filters: [{ code: "product-id-filter", arguments: [{ name: "productIds", value: JSON.stringify(ids) }] }],
      });
    });
  }
};
