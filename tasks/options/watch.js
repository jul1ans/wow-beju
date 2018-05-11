var configuration = require('../configuration');

module.exports = {
	options: {
		atBegin: false
	},
	css: {
		files: [
			configuration.assetPath + '**/less/**/*.less',
			'!' + configuration.assetPath + '**/less/**/*.min.*'
		],
		tasks: ['css_debug'],
		options: {
			spawn: false
		}
	},
	js: {
		files: [
			configuration.assetPath + '/js/**/*.js',
			'!' + configuration.assetPath + '/js/**/*.min.*'
		],
		tasks: ['js_debug'],
		options: {
			spawn: false
		}
	},
	images: {
		files: [
			configuration.assetPath + '/images/**/*.{png,jpg,gif}'
		],
			tasks: ['imagemin'],
			options: {
			spawn: false
		}
	}
};
