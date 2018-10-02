const path = require("path");
const fs = require("fs-extra");
const entries = require("./webpack.config").entry;
Object.keys(entries).forEach(demoId => {
  const targetPath = path.resolve(
    __dirname,
    "..",
    "docs",
    "jekyll",
    "demo",
    demoId
  );

  fs.copySync(
    path.resolve(__dirname, "index.html"),
    path.resolve(targetPath, "index.html")
  );
});
console.log("index.html succesfully copied to demo destinations");
