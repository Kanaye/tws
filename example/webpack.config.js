const { resolve } = require('path');
const htmlPlugin = require('html-webpack-plugin');

module.exports = (_, {w, watch}) => {
	const isDev = w || watch || false;

	return {
		mode: isDev ? "development" : "production",
		entry: './src/index.jsx',
		output: {
			path: resolve(__dirname, 'dist'),
			filename: '[name].js'
		},
		devtool: "sourcemap",
		module: {
			rules: [
				{
					test: /\.less$/,
					use: [
						'style-loader',
						'css-loader',
						'less-loader'
					]
				},
				{
					test: /\.m?js$/,
					loader: 'source-map-loader',
					enforce: 'pre'
				},
				{
					test: /\.jsx?$/,
					loader: 'babel-loader',
					options: {
						presets: [
							['@babel/preset-env', {
								targets: {
									browsers: ['>0.25%']
								},
								exclude: [
									'transform-regenerator',
									'transform-async-to-generator'
								]
							}]
						],
						plugins: [
							['@babel/plugin-transform-react-jsx', { pragma: 'h'}],
							"module:fast-async"
						]
					}
				}
			]
		},
		plugins: [
			new htmlPlugin()
		]
	}

};
