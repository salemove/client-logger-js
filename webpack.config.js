const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/ClientLogger.js',
  output: {
    filename: 'client-logger.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'client-logger',
    libraryTarget: 'umd'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      }
    ]
  }
};
