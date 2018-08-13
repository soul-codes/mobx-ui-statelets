module.exports = {
  mode: "development",
  entry: "./demo/index",
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js"]
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
    filename: "demo.js"
  }
};
