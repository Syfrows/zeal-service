const fs = require("fs");
const path = require("path");
const target = path.resolve("dist/static/assets");
const legacy = require("./legacy.json");
for (const name of fs.readdirSync(path.join(__dirname, "artwork"))) {
  for (const relative of legacy[name] || ["colourways/" + name]) {
    const dest = path.join(target, relative);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(__dirname, "artwork", name), dest);
  }
}
