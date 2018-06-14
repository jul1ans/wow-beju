/*globals GLOBALS, tracking*/


var App = App || {};

App.Tracking = (function (undefined) {

    var init = function () {

        var $body = $('body');

        var colors = new tracking.ColorTracker(['magenta', 'cyan', 'yellow']);

        $body.append('<div>-- START --</div>');

        colors.on('track', function(event) {
            if (event.data.length === 0) {
                // No colors were detected in this frame.
            } else {
                event.data.forEach(function(rect) {
                    $body.append('<div>x: ' + rect.x + ' y: ' + rect.y + '</div>');
                    // rect.x, rect.y, rect.height, rect.width, rect.color
                });
            }
        });

        tracking.track('#video', colors, { camera: true });

    };

    return {
        init: init
    };
})();