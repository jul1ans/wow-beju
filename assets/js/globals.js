/* globals QRCode*/

var GLOBALS = (function () {



    return {
        FUNCTIONS: {
            /**
             * Return GET parameter
             * @param parameterName
             * @returns {*}
             */
            findGetParameter: function (parameterName) {
                var result = null,
                    tmp = [];

                window.location.search
                .substr(1)
                .split("&")
                .forEach(function (item) {
                    tmp = item.split("=");
                    if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
                });
                return result;
            },
            /**
             * Create hash for sharing and display it as qr code
             * @return {string} shareHash
             */
            createShareCode: function () {
                var shareHash = 'ABC'; // todo: use correct hash
                var shareUrl = window.location.href + '?code=' + shareHash;
                new QRCode(document.getElementById("qrCode"), shareUrl);

                return shareHash;
            }
        }
    };
})();