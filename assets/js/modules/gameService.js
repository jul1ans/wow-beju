/*globals GLOBALS*/

var App = App || {};

App.GameService = (function (undefined) {

    var userType, socket;

    var useKeyboard = false; // todo: remove this

    /**
     * Initialize the host events which cause game changes
     * @private
     */
    var _initHostEvents = function () {

        App.Racer.registerFinishFunction(function (winner) {
            App.Racer.destroy();
            App.RoomService.showQrCode();

            if (winner === 0) {
                console.log('FINISHED - no winner');
            } else {
                console.log('FINISHED - player ' + winner + ' has won');
            }
        });

        // todo: remove this
        if (useKeyboard) {
            App.Racer.init();
            App.Racer.addPlayer();
            App.Racer.addPlayer();
            App.RoomService.hideQrCode();

            window.addEventListener('keydown', function (e) {
                if (e.key === 'ArrowLeft') {
                    App.Racer.updatePlayer({
                        playerIndex: 0,
                        tiltFB: -150
                    });
                } else if (e.key === 'ArrowRight') {
                    App.Racer.updatePlayer({
                        playerIndex: 0,
                        tiltFB: 150
                    });
                } else if (e.key === 'ArrowUp') {
                    App.Racer.updatePlayer({
                        playerIndex: 0,
                        powerUp: true
                    });
                }
            });
        } else {

            socket.on('controlData', function (data) {
                App.Racer.updatePlayer(data);
            });

            socket.on('playerConnect', function (amountPlayers) {
                console.log('player connected');

                // todo: handle multiple players
                if (amountPlayers === 1) {
                    App.RoomService.hideQrCode();

                    // init game
                    App.Racer.init();

                    App.Racer.addPlayer();
                }

            });

            socket.on('playerDisconnect', function () {
                App.Racer.destroy();
                App.RoomService.showQrCode();
            });
        }
    };

    /**
     * Initialize the player control which is connected to the server
     * @private
     */
    var _initPlayerControl = function () {
        // check if device supports orientation events
        if (!window.DeviceOrientationEvent) {
            alert('device not supported');
            return;
        }

        // init event listener for device orientation and emit control data to socket
        window.addEventListener('deviceorientation', function(event) {
            // emit device orientation
            socket.emit('controlData', {
                tiltLR: parseInt(event.gamma), // Get the left-to-right tilt (in degrees).
                tiltFB: parseInt(event.beta), // Get the front-to-back tilt (in degrees).
                direction: parseInt(event.alpha )// Get the direction of the device (in degrees).
            });
        });
    };

    var init = function () {
        App.RoomService.init();
        userType = App.RoomService.getUserType();
        socket = App.RoomService.getSocket();

        console.log(userType);

        if (userType === App.RoomService.USER_TYPES.HOST) {
            _initHostEvents();
        } else if (userType === App.RoomService.USER_TYPES.PLAYER) {
            _initPlayerControl();
        }
    };

    return {
        init: init
    };
})();