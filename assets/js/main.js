/* globals GLOBALS, io*/

(function () {

    var socket = io();

    // todo: implement handling for multiple connections
    var shareCode = GLOBALS.FUNCTIONS.findGetParameter('code');

    if (shareCode === null) {
        // desktop
        shareCode = GLOBALS.FUNCTIONS.createShareCode();

        var tilt = document.getElementById('tilt');
        var direction = document.getElementById('direction');

        socket.on('change', function (event) {
            tilt.innerHTML = event.tiltLR + ' ' + event.tiltFB;
            direction.innerHTML = event.direction;

            tilt.style.setProperty('--orientation-x', (event.tiltLR / 3.6) + 'px');
            tilt.style.setProperty('--orientation-y', (event.tiltFB / 3.6) + 'px');
            direction.style.setProperty('--orientation-x', ((event.direction - 180) / 3.6) + 'px');
        });
    } else if (window.DeviceOrientationEvent) {
        // mobile
        window.addEventListener('deviceorientation', function(event) {
            // emit device orientation
            socket.emit('deviceorientation', {
                tiltLR: parseInt(event.gamma), // Get the left-to-right tilt (in degrees).
                tiltFB: parseInt(event.beta), // Get the front-to-back tilt (in degrees).
                direction: parseInt(event.alpha )// Get the direction of the device (in degrees).
            });
        });
    }

})();

