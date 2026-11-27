const { Collection, CollectionService, FacetService, FacetValueService, LanguageCode, ProductService, RequestContextService, TransactionalConnection } = require("@vendure/core");

const activities = {
  Running: ["mens-running-shoes", "womens-running-tank", "split-running-shorts", "hooded-windbreaker", "mens-performance-tshirt"],
  Training: ["mens-training-shorts", "mens-performance-tshirt", "womens-training-shoes", "gym-gloves", "training-towel", "sports-duffel-bag", "womens-sports-bra", "racerback-crop-top"],
  Yoga: ["womens-yoga-leggings", "womens-sports-bra", "racerback-crop-top"],
  Cycling: ["cycling-shorts"],
  Swimming: ["pool-slides", "training-towel"],
  Everyday: ["training-polo", "long-sleeve-crew-shirt", "mens-track-jacket", "quilted-vest-jacket", "tapered-joggers", "straight-track-pants"],
};

module.exports = async function installActivity(app) {
  const db = app.get(TransactionalConnection);
  const ctx = await app.get(RequestContextService).create({ apiType: "admin" });
  const facets = app.get(FacetService);
  const products = app.get(ProductService);
  const lang = LanguageCode.en;
  const translations = name => [{ languageCode: lang, name }];
  await db.withTransaction(ctx, async tx => {
    const all = await app.get(CollectionService).findOneBySlug(tx, "all");
    await db.getRepository(tx, Collection).findOneOrFail({ where: { id: all.id }, lock: { mode: "pessimistic_write" } });
    if (await facets.findByCode(tx, "activity", lang)) return;
    const facet = await facets.create(tx, { code: "activity", isPrivate: false, translations: translations("Activity") });
    const assignments = new Map();
    for (const [name, slugs] of Object.entries(activities)) {
      const value = await app.get(FacetValueService).create(tx, facet, { code: name.toLowerCase(), translations: translations(name) });
      for (const slug of slugs) assignments.set(slug, [...(assignments.get(slug) || []), value.id]);
    }
    for (const [slug, ids] of assignments) {
      const product = await products.findOneBySlug(tx, slug, ["facetValues"]);
      if (product) await products.update(tx, { id: product.id, facetValueIds: [...product.facetValues.map(v => v.id), ...ids] });
    }
  });
};
