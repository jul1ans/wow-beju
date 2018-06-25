/*globals GLOBALS*/

var App = App || {};

App.GameService = (function (undefined) {

    var userType, socket;
    var HOST_EVENTS = {
        FINISH: 'finish'
    };

    var useKeyboard = false; // todo: remove this

    /**
     * Initialize the host events which cause game changes
     * @private
     */
    var _initHostEvents = function () {

        App.Racer.registerFinishFunction(function (winner) {
            App.Racer.destroy();
            App.RoomService.showQrCode();

            // todo: improve winner screen
            if (winner === 0) {
                console.log('FINISHED - no winner');
            } else {
                console.log('FINISHED - player ' + winner + ' has won');
            }

            socket.emit('hostData', {
                event: HOST_EVENTS.FINISH,
                body: winner
            });
        });

        // todo: remove this
        if (useKeyboard) {
            App.Racer.init();
            App.Racer.addPlayer();
            App.Racer.addPlayer();
            App.RoomService.hideQrCode();

            window.addEventListener('keydown', function (e) {
                if (e.key === 'ArrowLeft') {
                    App.Racer.updatePlayer(0, {
                        tiltFB: -150
                    });
                } else if (e.key === 'ArrowRight') {
                    App.Racer.updatePlayer(0, {
                        tiltFB: 150
                    });
                } else if (e.key === 'ArrowUp') {
                    App.Racer.updatePlayer(0, {
                        powerUp: true
                    });
                }
            });
        } else {
            socket.on('startGame', function () {

                App.RoomService.hideQrCode();

                // init game
                App.Racer.init();

                // todo: add correct player
                App.Racer.addPlayer();
                App.Racer.addPlayer();
            });

            socket.on('controlData', function (data) {

                // todo: update correct player
                console.log('receive data', data);
                App.Racer.updatePlayer(0, data);
            });

            // todo: implement endGame
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

        var finished = false;

        // show mobile hud
        var mobileHud = document.getElementById('mobile-hud');
        var startButton = document.getElementById('mobile-hud-start');
        var accelerateButton = document.getElementById('mobile-hud-accelerate');
        mobileHud.style.display = 'inherit';


        // inform host that player is ready
        startButton.addEventListener('click', function () {
            startButton.style.display = 'none';
            accelerateButton.style.display = 'inherit';

            socket.emit('playerReady');
        });


        // add listener for accelerate button
        accelerateButton.addEventListener('click', function () {
            if (finished === true) {
                return;
            }

            // emit powerUp event
            socket.emit('controlData', {
                powerUp: true
            });
        });


        // init event listener for device orientation and emit control data to socket
        window.addEventListener('deviceorientation', function(event) {
            if (finished === true) {
                return;
            }

            // emit device orientation
            socket.emit('controlData', {
                tiltLR: parseInt(event.gamma), // Get the left-to-right tilt (in degrees).
                tiltFB: parseInt(event.beta), // Get the front-to-back tilt (in degrees).
                direction: parseInt(event.alpha )// Get the direction of the device (in degrees).
            });
        });

        // init events
        socket.on('hostData', function (data) {
            switch (data.event) {
                case HOST_EVENTS.FINISH:
                    finished = true;

                    // todo: refactor message
                    if (data === 0) {
                        alert('Oh no, there is no winner');
                    } else {
                        alert('The winner is player #' + data.body);
                    }
                    break;
            }
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