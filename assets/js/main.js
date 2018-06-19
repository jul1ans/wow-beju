/* globals GLOBALS*/

(function () {

    App.RoomService.init();

    var userType = App.RoomService.getUserType();
    var socket = App.RoomService.getSocket();

    console.log(userType);

    if (userType === App.RoomService.USER_TYPES.HOST) {
        // todo: move this code into a own module

        socket.on('controlData', function (data) {
            console.log('receive data', data);
        });

    } else if (userType === App.RoomService.USER_TYPES.PLAYER) {

        // todo: move this code into a own module

        // check if device supports orientation events
        if (!window.DeviceOrientationEvent) {
            alert('device not supported');
            return;
        }

        window.addEventListener('deviceorientation', function(event) {
            // emit device orientation
            socket.emit('controlData', {
                tiltLR: parseInt(event.gamma), // Get the left-to-right tilt (in degrees).
                tiltFB: parseInt(event.beta), // Get the front-to-back tilt (in degrees).
                direction: parseInt(event.alpha )// Get the direction of the device (in degrees).
            });
        });
    }
})();

