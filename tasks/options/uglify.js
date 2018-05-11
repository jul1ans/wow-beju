var configuration = require('../configuration');

var files = {};

files[configuration.assetPathDist + '/footer.min.js'] = [configuration.assetPathDist + '/footer.min.js'];

module.exports = {
	production: {
		files: files
	}
};
