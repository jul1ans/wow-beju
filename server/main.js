var express = require('express');
var ejs = require('ejs');
var app = express();
var httpServer = require('http').Server(app);
var path = require('path');
var RoomService = require('./modules/roomService.js');

var _viewsDir = path.resolve('views');
var _distDir = path.resolve('dist');

app.set('view engine', 'ejs');

app.get('/', function (req, res) {
    res.render(_viewsDir + '/index.ejs', {
        // todo: check for development mode or production
        timestamp: Date.now()
    });
});

app.use(
    '/dist',
    express.static(
        _distDir,
        // {maxAge: 30 * 24 * 60 * 60}
        {maxAge: 1}
    )
);

httpServer.listen(2727, function () {
    console.log('listening on *:2727');
});

var io = require('socket.io')(httpServer);

RoomService.init(io);

