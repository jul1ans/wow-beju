
var configuration = require("../configuration");

module.exports = function (grunt) {
    return {
        local:{
            bsFiles: {
                src : configuration.assetPath + '/*.css'
            },
            options: {
                server: true,
                files:  configuration.assetPathDist + '/**',
                watchTask: true,
                https: grunt.option('https')
            }
        },

        proxy:{
            bsFiles: {
                src : configuration.assetPath + '/dist/*.css'
            },
            options: {
                proxy: "localhost:2727",

                files:  configuration.assetPathDist + '/**',

                serveStatic: [{
                    route: configuration.assetPathDist,
                    dir: configuration.assetPathDist
                }],

                watchTask: true,
                https: grunt.option('https')
            }
        }
    }
};
