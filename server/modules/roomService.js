
var CONFIG = {
    MAX_PLAYER: 2
};

var Room = function (host) {
    this.host = host;
    this.players = [];
};

/**
 * Set host
 * @param host
 */
Room.prototype.setHost = function (host) {
    this.host = host;
};

/**
 * Add player if maximum amount is not reached
 * @param player
 * @return {boolean}
 */
Room.prototype.addPlayer = function (player) {
    if (this.players.length >= CONFIG.MAX_PLAYER) return false;

    this.players.push(player);
    this.informHost('playerConnect');

    return true;
};

/**
 * Trigger given event with given data on each player
 * @param event
 * @param data
 */
Room.prototype.informPlayer = function (event, data) {
    this.players.forEach(function (player) {
        player.emit(event, data);
    });
};

/**
 * Trigger given event with given data on host
 * @param event
 * @param data
 */
Room.prototype.informHost = function (event, data) {
    this.host.emit(event, data);
};

/**
 * Find player and remove it from array
 * @param player
 * @return {boolean}
 */
Room.prototype.removePlayer = function (player) {
    var index = this.players.indexOf(player);

    if (index === -1) return false;
    this.players.splice(index, 1);

    this.informHost('playerDisconnect');

    return true;
};

var RoomService = (function (undefined) {

    var rooms = {};

    /**
     * Create new room or set host if room already exists
     * @param roomId
     * @param host
     * @private
     */
    var _createRoom = function (roomId, host) {
        console.log('ROOM: create', roomId);

        if (rooms.hasOwnProperty(roomId)) {
            // set room host if room already exists
            rooms[roomId].setHost(host);
        } else {
            // create new room
            rooms[roomId] = new Room(host);
        }

        // init socket events

        // destroy room
        host.on('disconnect', function () {
            console.log('ROOM: destroy', roomId);
            rooms[roomId].informPlayer('hostDisconnect');
            delete rooms[roomId];
        });

        // send host data to all player
        host.on('hostData', function (data) {
            rooms[roomId].informPlayer('hostData', data);
        });
    };

    /**
     * Player joins room
     * @param roomId
     * @param player
     * @private
     */
    var _joinRoom = function (roomId, player) {
        if (!rooms.hasOwnProperty(roomId)) return false;

        var playerReady = false;

        console.log('PLAYER: add to room', roomId);
        rooms[roomId].addPlayer(player);

        // init socket events

        // remove events on host disconnect
        rooms[roomId].host.on('disconnect', function () {
            player.removeAllListeners('disconnect');
            player.removeAllListeners('controlData');
        });

        // remove player on disconnect
        player.on('disconnect', function () {
            console.log('PLAYER: remove from room', roomId);
            rooms[roomId].removePlayer(player);
        });

        // send control data to host
        player.on('controlData', function (data) {
            rooms[roomId].informHost('controlData', data);
        });

        // listen for ready event
        player.on('playerReady', function () {
            if (playerReady) return;
            playerReady = true;

            // todo: check if all player are ready
            rooms[roomId].informHost('startGame');
        });
    };

    /**
     * Init socket connection and room handling
     * @param io
     */
    var init = function (io) {
        io.on('connection', function (socket) {
            console.log('GENERAL: a user connected');

            // HOST
            socket.on('newRoom', function (roomId) {
                _createRoom(roomId, socket);
            });

            // PLAYER
            socket.on('joinRoom', function (roomId) {
                _joinRoom(roomId, socket);
            });
        });
    };

    return {
        init: init
    };
})();

exports = module.exports = RoomService;