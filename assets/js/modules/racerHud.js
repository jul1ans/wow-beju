/*globals GLOBALS, THREE, Stats, performance*/

var App = App || {};

App.RacerHud = (function (undefined) {

    var initCalled = false,
        players = [],
        containerEl, playersEl, winnerEl;

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

    /**
     * Show winner text
     * @param text
     */
    var showWinner = function (text) {
        winnerEl = document.createElement('div');
        winnerEl.classList.add('racer-hud__winner');
        winnerEl.innerText = text;

        window.document.body.appendChild(winnerEl);

        window.setTimeout(hideWinner, 5000);
    };

    var hideWinner = function () {
        if (winnerEl === undefined) return;
        window.document.body.removeChild(winnerEl);
        winnerEl = undefined;
    };

    return {
        init: init,
        destroy: destroy,
        addPlayer: addPlayer,
        removePowerUp: removePowerUp,
        addPowerUp: addPowerUp,
        hideWinner: hideWinner,
        showWinner: showWinner
    };

})();