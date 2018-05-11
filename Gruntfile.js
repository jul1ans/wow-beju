var timer = require("grunt-timer");

module.exports = function(grunt) {
	timer.init(grunt);

	// load all grunt tasks matching the ['grunt-*', '@*/grunt-*'] patterns
	require('load-grunt-tasks')(grunt);

	grunt.loadTasks('tasks');

	function loadConfig(path) {
		var glob = require('glob');
		var object = {};
		var key;

		glob.sync('*', {cwd: path}).forEach(function(option) {
			key = option.replace(/\.js$/,'');
			object[key] = require(path + option);

			if (typeof object[key] === 'function') {
                object[key] = object[key](grunt);
			}
		});

		return object;
	}

	var config = {};
	grunt.util._.extend(config, loadConfig('./tasks/options/'));
	grunt.initConfig(config);

};