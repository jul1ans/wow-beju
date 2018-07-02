/* globals GLOBALS, NoSleep*/

(function () {

    App.GameService.init();

    $('body').one('click, mousemove', function () {
        $(this).addClass('no-touch');
    });


    var noSleep = new NoSleep();

    function enableNoSleep() {
        noSleep.enable();
        document.removeEventListener('click', enableNoSleep, false);
    }

    // Enable wake lock.
    // (must be wrapped in a user input event handler e.g. a mouse or touch handler)
    document.addEventListener('click', enableNoSleep, false);
})();

