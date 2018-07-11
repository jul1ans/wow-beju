var configurationLocal = require('./configuration_local');
var merge = require('merge');


var assetPath = './assets';
var assetPathDist = './dist';


var nodeModulesPath = './node_modules';
var bowerPath = assetPath + '/bower_components';

module.exports = merge({
    assetPathDist: assetPathDist,
    assetPath: assetPath,
    bowerPath: bowerPath,
    nodeModulesPath: nodeModulesPath,

    footerJsFiles: [ // Js files to include in the footer

        // node modules
        nodeModulesPath + '/jquery/dist/jquery.js',
        nodeModulesPath + '/nosleep.js/dist/NoSleep.js',
        nodeModulesPath + '/three/build/three.js',
        nodeModulesPath + '/three/examples/js/loaders/ColladaLoader.js',

        // vendor files
        assetPath + '/js/vendor/qrcode.js',
        assetPath + '/js/vendor/stats.js',


        // project files
        assetPath + '/js/modules/**/*.js',
        assetPath + '/js/globals.js',
        assetPath + '/js/main.js'
    ],
    cssFiles: [ // additional css files (main.less is included by default)
    ],

    jsHint: {
        files: {
            src: [
                assetPath + '/**/js/**/*.js',
                '!' + assetPath + '/**/js/vendor/**/*.js', // do not hint other vendors js
                '!' + assetPath + '/**/bower.js', // do not hint js that comes from bower packages
                '!' + assetPath + '/**/js/*.min.js' // do not hint compiled files
            ]
        },
        globals: {
            '$': true,
            'window': true,
            'document': true,
            'App': true,
            'alert': true,
            'console': true
        }
    }
}, configurationLocal);
