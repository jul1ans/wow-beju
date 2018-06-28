/* globals GLOBALS*/

(function () {

    App.GameService.init();

    $('body').one('click, mousemove', function () {
        $(this).addClass('no-touch');
    });
})();

