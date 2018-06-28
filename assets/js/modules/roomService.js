/*globals GLOBALS, io, QRCode*/

var App = App || {};

App.RoomService = (function (undefined) {

    var userType, socket, config;

    var DEFAULT_CONFIG = {
        codeParam: 'code',
        typeParam: 'type',
        qrElement: document.getElementById("qrCode"),
        $startScreen: $("#start-screen")
    };

    var USER_TYPES = {
        HOST: 'host',
        PLAYER: 'player'
    };

    /**
     * Create hash for sharing and display it as qr code
     * @param {string} (shareHash)
     * @return {string} shareHash
     */
    var _createShareCode = function (shareHash) {
        config.$startScreen.removeClass('hidden');

        if (shareHash === undefined) {
            // shareHash = 'BaJ' + Math.floor(Math.random() * 100000);
            shareHash = 'BaJ';
        }

        var shareUrl = window.location.href + '?' + config.typeParam + '=' + USER_TYPES.PLAYER + '&' + config.codeParam + '=' + shareHash;
        new QRCode(config.qrElement, shareUrl);

        return shareHash;
    };

    /**
     * Init host
     * - create share code with QR image
     * - init socket connection
     * @param {string} (shareCode)
     * @private
     */
    var _initHost = function (shareCode) {
        shareCode = _createShareCode(shareCode);
        socket.emit('newRoom', shareCode);
    };

    /**
     * Init player
     * - init socket connection
     * - init device control
     * @param {string} (roomId)
     * @private
     */
    var _initPlayer = function (roomId) {
        socket.emit('joinRoom', roomId);

        socket.on('hostDisconnect', function () {
            alert('host disconnected');
        });
    };

    var init = function (c) {
        config = c;

        // concat given concat and default config
        if (config === undefined) {
            config = DEFAULT_CONFIG;
        } else {
            for (var i in DEFAULT_CONFIG) {
                if (!DEFAULT_CONFIG.hasOwnProperty(i) || config.hasOwnProperty(i))
                    continue;

                config[i] = DEFAULT_CONFIG[i];
            }
        }

        var shareCode = GLOBALS.FUNCTIONS.findGetParameter(config.codeParam);

        socket = io();
        userType = GLOBALS.FUNCTIONS.findGetParameter(config.typeParam);

        // init host or user depending on given data
        if (userType === null) {
            // init host
            _initHost();
            userType = USER_TYPES.HOST;
        } else if (userType === USER_TYPES.HOST && shareCode !== null) {
            // re-init host with specific shareCode
            _initHost(shareCode);
        } else if (userType === USER_TYPES.PLAYER && shareCode !== null) {
            // join room
            _initPlayer(shareCode);
        }
    };

    /**
     * Return user type
     * @return {string}
     */
    var getUserType = function () {
        return userType;
    };

    /**
     * Return socket object
     * @return {*}
     */
    var getSocket = function () {
        return socket;
    };

    var hideQrCode = function () {
        DEFAULT_CONFIG.$startScreen.addClass('hidden');
    };

    var showQrCode = function () {
        DEFAULT_CONFIG.$startScreen.removeClass('hidden');
    };

    return {
        init: init,
        USER_TYPES: USER_TYPES,
        getUserType: getUserType,
        getSocket: getSocket,
        showQrCode: showQrCode,
        hideQrCode: hideQrCode
    };
})();