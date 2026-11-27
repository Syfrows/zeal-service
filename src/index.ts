import { bootstrap } from "@vendure/core";
import { config } from "./vendure-config";

bootstrap(config).then(async app => {
  await require(process.cwd() + "/catalog/install-colorways")(app);
  await require(process.cwd() + "/catalog/install-category-products")(app);
  await require(process.cwd() + "/catalog/install-product-types")(app);
}).catch((err) => {
  console.log(err);
});
