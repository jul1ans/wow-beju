var configurationLocal = require('./configuration_local');
var merge = require('merge');


const assetPath = './assets';
const assetPathDist = './dist';


const nodeModulesPath = '/node_modules';
const bowerPath = assetPath + '/bower_components';

module.exports = merge({
    assetPathDist: assetPathDist,
    assetPath: assetPath,
    bowerPath: bowerPath,
    nodeModulesPath: nodeModulesPath,

    footerJsFiles: [ // Js files to include in the footer

        // vendor files
        assetPath + '/js/vendor/qrcode.js',

        // project files
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
            'App': true
        }
    }
}, configurationLocal);
