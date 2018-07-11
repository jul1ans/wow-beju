module.exports = function(grunt) {
	grunt.registerTask(
		'build', [
			'clean:initial',
			'jshint:production',
			'less',
			'concat',
			'uglify:production',
			'cssmin:production',
			'clean:afterBuild'
		]
	);

	grunt.registerTask('css_debug', ['less']);
	grunt.registerTask('js_debug', ['jshint:debug', 'concat']);

	grunt.registerTask(
		'default', [
			'css_debug',
			'js_debug',
            // 'browserSync:proxy',
			'concurrent:watch'
		]
	);
};
