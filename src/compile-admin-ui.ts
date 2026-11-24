import { compileUiExtensions, setBranding } from "@vendure/ui-devkit/compiler";
import path from "path";
import { ReviewsPlugin } from "./plugins/reviews/reviews-plugin";
import { promises as fs } from "fs";
import { DEFAULT_BASE_HREF } from "@vendure/ui-devkit/compiler/constants";
import { InvoicePlugin } from "@pinelab/vendure-plugin-invoices";

if (require.main === module) {
  // Called directly from command line
  customAdminUi({ recompile: true, devMode: false })
    .compile?.()
    .then(() => {
      if (process.env.APP_ENV !== "dev") {
        console.log(
          "Overwriting the vendure-ui-config.json for Vercel deployment."
        );
        return fs.writeFile(
          path.join(
            __dirname,
            "..",
            "admin-ui",
            "dist",
            "vendure-ui-config.json"
          ),
          JSON.stringify({
            apiHost: "https://api.relaxzeal.com",
            apiPort: "443",
            adminApiPath: "admin-api",
            tokenMethod: "bearer",
            defaultLanguage: "en",
            availableLanguages: ["en", "de"],
            brand: "Zeal",
            loginImageUrl: "https://zeal.relaxzeal.com/zeal/account.webp",
            hideVendureBranding: true,
            hideVersion: false,
          })
        );
      }
    })
    .then(() => {
      process.exit(0);
    });
}

export function customAdminUi(options: {
  recompile: boolean;
  devMode: boolean;
}) {
  const compiledAppPath = path.join(__dirname, "../admin-ui");
  if (options.recompile) {
    return compileUiExtensions({
      outputPath: compiledAppPath,
      baseHref: options.devMode ? DEFAULT_BASE_HREF : "/",
      extensions: [
        { globalStyles: path.join(__dirname, "ui-extensions/zeal-theme/admin.css") },
        ReviewsPlugin.uiExtensions,
        InvoicePlugin.ui,
        setBranding({
          // The small logo appears in the top left of the screen
          smallLogoPath: path.join(__dirname, "images/logo.png"),
          // The large logo is used on the login page
          largeLogoPath: path.join(__dirname, "images/logo.png"),
          faviconPath: path.join(__dirname, "images/favicon.ico"),
        }),
      ],
      devMode: options.devMode,
    });
  } else {
    return {
      path: path.join(compiledAppPath, "dist"),
    };
  }
}
