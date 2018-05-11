var configuration = require('../configuration');

module.exports = {
	options: {
		stderr: true
	},
	bowerInstall: {
		command: 'bower install'
	},
	bowerPrune: {
		command: 'bower prune'
	},
	npmInstall: {
		command: 'npm install'
	}
};