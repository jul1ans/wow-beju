var configuration = require('../configuration');

module.exports = {
    options: {
        logConcurrentOutput: true
    },
    watch: {
        tasks: ['watch:css', 'watch:js', 'watch:images']
    }
};
