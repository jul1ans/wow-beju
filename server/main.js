var express = require('express');
var ejs = require('ejs');
var app = express();
var http = require("http");
var httpServer = require('http').Server(app);
var path = require('path');
var RoomService = require('./modules/roomService.js');

var _viewsDir = path.resolve('views');
var _distDir = path.resolve('dist');
var _publicDir = path.resolve('public');
var io = require('socket.io')(httpServer);

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
        // todo: check for development
        {maxAge: 1}
    )
);

app.use(
    '/public',
    express.static(
        _publicDir,
        // {maxAge: 30 * 24 * 60 * 60}
        // todo: check for development
        {maxAge: 1}
    )
);

var port = process.env.PORT || 2727;

httpServer.listen(port, function () {
    console.log('START SERVER - listen: ' + port);
});

RoomService.init(io);


function pingHeroku() {
    http.get('http://wow-beju.herokuapp.com/');

    window.setTimeout(pingHeroku, 1200000) // ping every 20 minutes
}


// todo: only ping in production
pingHeroku();

