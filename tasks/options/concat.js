var configuration = require('../configuration');

module.exports = {
	options: {
		separator: '',
		sourceMap: configuration.jsSourceMap,
		sourceMapStyle: 'embed'
	},
	footer: {
		src: configuration.footerJsFiles,
		dest: configuration.assetPathDist + '/footer.min.js'
	}
};
