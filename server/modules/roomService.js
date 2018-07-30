
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
    this.players.push(player);

    var playerLength = 0;

    // calculate player length -> there can be empty entries
    this.players.forEach(function (player) {
        if (player === null) return;
        playerLength += 1;
    });

    this.informHost('playerConnect', playerLength);

    return true;
};

/**
 * Trigger given event with given data on each player
 * @param event
 * @param data
 */
Room.prototype.informPlayer = function (event, data) {
    this.players.forEach(function (player) {
        if (player === null) return;
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
    var index = this.getPlayerIndex(player);

    if (index === -1) return false;

    this.players.splice(index, 1);

    this.informHost('playerDisconnect');

    return true;
};

/**
 * Get player index
 * @param player
 * @returns {number}
 */
Room.prototype.getPlayerIndex = function (player) {
    return this.players.indexOf(player);
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

        // send new player data to client
        host.on('newPlayerData', function (data) {
            if (rooms[roomId].players[data.index] === undefined) {
                console.error('Missing player with index: ' + data.index);
                return;
            }

            rooms[roomId].players[data.index].emit('newPlayerData', data);
        });

        // send winner index to all player
        host.on('finish', function (winner) {
            rooms[roomId].informPlayer('finish', winner);
            // reset player after finish event
            rooms[roomId].players = [];
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

        var index = rooms[roomId].getPlayerIndex(player);

        // init socket events

        // remove events on host disconnect
        rooms[roomId].host.on('disconnect', function () {
            if (!rooms[roomId]) return;
            player.removeAllListeners('disconnect');
            player.removeAllListeners('controlData');
            player.removeAllListeners('playerReady');
        });

        // re-calculate index
        rooms[roomId].host.on('playerConnect', function () {
            if (!rooms[roomId]) return;
            index = rooms[roomId].getPlayerIndex(player);
            console.log('re-calc player index', index);
        });

        rooms[roomId].host.on('vibrate', function (data) {
            if (data.index !== index || !rooms[roomId]) return;
            player.emit('vibrate', data);
        });

        // remove player on disconnect
        player.on('disconnect', function () {
            if (!rooms[roomId]) return;
            console.log('PLAYER: remove from room', roomId);
            rooms[roomId].removePlayer(player);
        });

        // send control data to host
        player.on('controlData', function (data) {
            if (!rooms[roomId]) return;
            data.playerIndex = index;
            rooms[roomId].informHost('controlData', data);
        });

        // listen for ready event
        player.on('playerReady', function () {
            if (playerReady || !rooms[roomId]) return;
            playerReady = true;

            rooms[roomId].informHost('playerReady');
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