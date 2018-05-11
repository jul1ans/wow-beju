var configuration = require('../configuration');

module.exports = {
	initial: [
		configuration.assetPathDist +  '/*'
	],
	afterBuild: [
		configuration.assetPathDist + '/bower.css'
	]
};
