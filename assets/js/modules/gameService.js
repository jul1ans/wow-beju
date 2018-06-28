/*globals GLOBALS*/

var App = App || {};

App.GameService = (function (undefined) {

    var userType, socket;
    var HOST_EVENTS = {
        FINISH: 'finish'
    };

    var TEXT = {
        draw: 'Unentschieden',
        winner: function (winner) {return 'Der Spieler #' + winner + ' hat gewonnen';},
        notSupportedDevice: 'Ihr Gerät wird nicht unterstützt'
    };

    var $window = $(window);

    /**
     * Add player and inform clients about player informations
     * @param socket
     * @private
     */
    var _addPlayer = function (socket) {
        var playerData = App.Racer.addPlayer();

        socket.emit('newPlayerData', playerData);
    };

    /**
     * Start game with keyobard control
     * @private
     */
    var _startKeyboardGame = function () {
        App.Racer.init();
        App.Racer.addPlayer();
        App.Racer.addPlayer();
        App.RoomService.hideQrCode();

        $window.on('keydown', function (e) {
            if (e.key === 'ArrowLeft') {
                App.Racer.updatePlayer({
                    playerIndex: 1,
                    tiltFB: -150
                });
            } else if (e.key === 'ArrowRight') {
                App.Racer.updatePlayer({
                    playerIndex: 1,
                    tiltFB: 150
                });
            } else if (e.key === 'ArrowUp') {
                App.Racer.updatePlayer({
                    playerIndex: 1,
                    powerUp: true
                });
            } else if (e.key === 'a') {
                App.Racer.updatePlayer({
                    playerIndex: 0,
                    tiltFB: -150
                });
            } else if (e.key === 'd') {
                App.Racer.updatePlayer({
                    playerIndex: 0,
                    tiltFB: 150
                });
            } else if (e.key === 's') {
                App.Racer.updatePlayer({
                    playerIndex: 0,
                    powerUp: true
                });
            }
        });
    };

    /**
     * Initialize the host events which cause game changes
     * @private
     */
    var _initHostEvents = function () {

        var MAX_AMOUNT = App.Racer.getMaxAmount(), initCallbacks = [];

        App.Racer.registerFinishFunction(function (winner) {
            App.Racer.destroy();
            App.RoomService.showQrCode();

            if (winner === 0) {
                App.RacerHud.showWinner(TEXT.draw);
            } else {
                App.RacerHud.showWinner(TEXT.winner(winner));
            }

            socket.emit('finish', winner);
        });

        $('#keyboard-game').one('click', _startKeyboardGame);

        socket.on('controlData', function (data) {
            App.Racer.updatePlayer(data);
        });

        socket.on('playerReady', function () {
            if (App.Racer.isDestroyed()) {
                initCallbacks.push(_addPlayer.bind(this, socket));
            } else {
                _addPlayer(socket);
            }
        });

        socket.on('playerConnect', function (amountPlayers) {
            console.log('player connected', amountPlayers);

            App.RacerHud.hideWinner();

            if (amountPlayers === MAX_AMOUNT) {
                App.RoomService.hideQrCode();

                // init game
                App.Racer.init();

                for (var i = 0; i < initCallbacks.length; i++) {
                    initCallbacks[i]();
                }

                initCallbacks = [];
            }
        });

        socket.on('playerDisconnect', function () {
            App.Racer.destroy();
            App.RoomService.showQrCode();
        });
    };

    /**
     * Initialize the player control which is connected to the server
     * @private
     */
    var _initPlayerControl = function () {
        // check if device supports orientation events
        if (!window.DeviceOrientationEvent) {
            alert(TEXT.notSupportedDevice);
            return;
        }

        var finished = false;

        // show mobile hud
        var $mobileHud = $('#mobile-hud');
        var $startButton = $('#mobile-hud-start');
        var $accelerateButton = $('#mobile-hud-accelerate');
        var $endWrapper = $('#mobile-hud-end-wrapper');
        var $endText = $('#mobile-hud-end-text');
        $mobileHud.removeClass('hidden');


        // inform host that player is ready
        $startButton.one('click', function () {
            $startButton.addClass('hidden');
            $accelerateButton.removeClass('hidden');

            socket.emit('playerReady');
        });


        // add listener for accelerate button
        $accelerateButton.on('click', function () {
            if (finished === true) {
                $accelerateButton.off('click');
                return;
            }

            // emit powerUp event
            socket.emit('controlData', {
                powerUp: true
            });
        });

        // init event listener for device orientation and emit control data to socket
        $window.on('deviceorientation', function(event) {
            if (finished === true) {
                $window.off('deviceorientation');
                return;
            }

            // todo: calibrate with initial position

            // emit device orientation
            socket.emit('controlData', {
                tiltLR: parseInt(event.gamma), // Get the left-to-right tilt (in degrees).
                tiltFB: parseInt(event.beta), // Get the front-to-back tilt (in degrees).
                direction: parseInt(event.alpha )// Get the direction of the device (in degrees).
            });
        });

        // player data event
        socket.on('newPlayerData', function (data) {
            document.body.style.backgroundColor = data.color;
        });

        // finish event
        socket.on('finish', function (winner) {
            finished = true;
            $endWrapper.removeClass('hidden');
            $accelerateButton.addClass('hidden');

            if (winner === 0) {
                $endText.text(TEXT.draw);
            } else {
                $endText.text(TEXT.winner(winner));
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