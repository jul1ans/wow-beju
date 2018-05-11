var configuration = require('../configuration');

module.exports = {
	debug: {
		options: {
			debug: true, // allow debugger statements
			undef: true,
			devel: true,
			globals: configuration.jsHint.globals
		},
		files: configuration.jsHint.files
	},
	production: {
		options: {
			debug: false,
			undef: true,
			devel: false, // do not allow console.log etc.
			globals: configuration.jsHint.globals
		},
		files: configuration.jsHint.files
	}
};