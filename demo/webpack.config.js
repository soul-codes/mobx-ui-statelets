const path = require("path");
const glob = require("glob");
const indexPaths = glob.sync(path.join(__dirname, "*/**/index.tsx"));
const entries = {};

for (let i = 0; i < indexPaths.length; i++) {
  const indexPath = indexPaths[i];
  const basePath = path.dirname(indexPath);
  const fragments = basePath.split(path.sep);
  const demoId = fragments[fragments.length - 1];
  entries[demoId] = indexPath;
}

module.exports = {
  mode: "development",
  entry: entries,
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js"],
    alias: {
      "mobx-ui-statelets": path.resolve(__dirname, "..", "src")
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "awesome-typescript-loader"
      }
    ]
  },
  output: {
    filename: path.join("[name]", "demo-app.js"),
    path: path.resolve(__dirname, "..", "docs", "jekyll", "demo")
  },
  devtool: "source-map"
};
