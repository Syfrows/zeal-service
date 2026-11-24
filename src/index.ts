import { bootstrap } from "@vendure/core";
import { config } from "./vendure-config";

bootstrap(config).then(app => require(process.cwd() + "/catalog/install-colorways")(app)).catch((err) => {
  console.log(err);
});
