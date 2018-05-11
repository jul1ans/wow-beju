var configuration = require('../configuration');

var files = {};

// base
files[configuration.assetPathDist + '/main.min.css'] = configuration.cssFiles.concat([
    configuration.assetPath + '/less/main.less'
]);

module.exports = {
	options: {
		plugins: [
			new (require('less-plugin-autoprefix'))({browsers: ["> 1%"]})
		],
		paths: [
			'bower_components'
		]
	},
	main: {
		options: {
			sourceMap: configuration.cssSourceMap, // enable when needed, consumes much time when compiling
			sourceMapURL: 'main.min.css.map',
			sourceMapRootpath: '../../'
		},
		files: files
	}
};
