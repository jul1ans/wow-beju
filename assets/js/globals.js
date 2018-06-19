/* globals*/

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
            }
        }
    };
})();