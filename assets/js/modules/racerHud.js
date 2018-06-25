/*globals GLOBALS, THREE, Stats, performance*/

var App = App || {};

App.RacerHud = (function (undefined) {

    var initCalled = false,
        players = [],
        containerEl, playersEl;

    var init = function () {
        if (initCalled) return;
        initCalled = true;
        containerEl = document.getElementById('racer-hud');
        containerEl.style.display = 'inherit';
        playersEl = document.getElementById('racer-hud-players');
    };

    var destroy = function () {
        playersEl.innerHTML = '';
        players = [];
    };

    /**
     * Create new hud element for player
     * @param index
     * @param color
     */
    var addPlayer = function (index, color) {
        init();

        var playerEl = document.createElement('div');

        playerEl.classList.add('racer-hud__player');
        playerEl.classList.add('racer-hud__player--' + index);
        playerEl.style.color = color;

        playersEl.append(playerEl);
        players[index] = playerEl;
    };

    /**
     * Add power up element to player
     * @param index
     */
    var addPowerUp = function (index) {
        if (!players.hasOwnProperty(index)) return;

        players[index].append(document.createElement('span'));
    };

    /**
     * Remove power up element from player
     * @param index
     */
    var removePowerUp = function (index) {
        if (!players.hasOwnProperty(index)) return;

        players[index].removeChild(players[index].childNodes[0]);
    };

    return {
        init: init,
        destroy: destroy,
        addPlayer: addPlayer,
        removePowerUp: removePowerUp,
        addPowerUp: addPowerUp
    };

})();