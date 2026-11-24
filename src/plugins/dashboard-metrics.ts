import { PluginCommonModule, VendurePlugin } from "@vendure/core";
import { adminApiExtensions } from "@vendure/admin-ui-plugin/lib/src/api/api-extensions";
import { MetricsResolver } from "@vendure/admin-ui-plugin/lib/src/api/metrics.resolver";
import { MetricsService } from "@vendure/admin-ui-plugin/lib/src/service/metrics.service";

// The production UI is hosted separately. Register its version-matched metrics
// extension on the API without mounting a second copy of the admin interface.
@VendurePlugin({
  imports: [PluginCommonModule],
  adminApiExtensions: { schema: adminApiExtensions, resolvers: [MetricsResolver] },
  providers: [MetricsService],
  compatibility: "^2.0.0",
})
export class DashboardMetricsPlugin {}
