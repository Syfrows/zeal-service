import { bootstrap } from "@vendure/core";
import { config } from "./vendure-config";

bootstrap(config).then(async app => {
  await require(process.cwd() + "/catalog/install-colorways")(app);
  await require(process.cwd() + "/catalog/install-category-products")(app);
}).catch((err) => {
  console.log(err);
});
