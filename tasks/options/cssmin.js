var configuration = require('../configuration');

var files = {};

// BASE CSS
files[configuration.assetPathDist + '/main.min.css'] = [
	configuration.assetPathDist + '/main.min.css'
];


module.exports = {
	production: {
		files: files
	}
};
