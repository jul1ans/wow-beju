/*globals GLOBALS, THREE, Stats, performance*/

var App = App || {};

App.RacerHud = (function (undefined) {

    var initCalled = false,
        players = [],
        $container, $players, $winner, $body = $('body');

    var init = function () {
        if (initCalled) {
            $container.removeClass('hidden');
        } else {
            initCalled = true;
            $container = $('#racer-hud');
            $container.removeClass('hidden');
            $players = $('#racer-hud-players');
        }
    };

    var destroy = function () {
        $players.html('');
        players = [];
    };

    /**
     * Create new hud element for player
     * @param index
     * @param color
     */
    var addPlayer = function (index, color) {
        init();

        var $player = $('<div class="racer-hud__player racer-hud__player--' + index + '" style="color: ' + color + '">');
        $players.append($player);

        players[index] = $player;
    };

    /**
     * Add power up element to player
     * @param index
     */
    var addPowerUp = function (index) {
        if (!players.hasOwnProperty(index)) return;

        players[index].append($('<span>'));
    };

    /**
     * Remove power up element from player
     * @param index
     */
    var removePowerUp = function (index) {
        if (!players.hasOwnProperty(index)) return;

        players[index].children().last().remove();
    };

    /**
     * Show winner text
     * @param text
     */
    var showWinner = function (text) {
        $winner = $('<div class="racer-hud__winner">');
        $winner.text(text);

        $body.append($winner);

        window.setTimeout(hideWinner, 5000);
    };

    var hideWinner = function () {
        if ($winner === undefined) return;
        $winner.remove();
        $winner = undefined;
        $container.addClass('hidden');
    };
    
    var showInfoText = function (text, duration) {
        var $text = $('<div class="racer-hud__info">' + text + '</div>');
        
        $body.append($text);
        
        window.setTimeout(function () {
            $text.remove(); 
        }, duration);
    };

    return {
        init: init,
        destroy: destroy,
        addPlayer: addPlayer,
        removePowerUp: removePowerUp,
        addPowerUp: addPowerUp,
        hideWinner: hideWinner,
        showWinner: showWinner,
        showInfoText: showInfoText
    };

})();