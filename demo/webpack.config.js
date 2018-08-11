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
      },
      {
        test: /\.js?/,
        exclude: /node_modules/,
        use: "babel-loader?presets=react"
      }
    ]
  },
  output: {
    filename: "demo.js"
  }
};
