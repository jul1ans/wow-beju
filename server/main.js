var fs = require('fs');
var express = require('express');
var app = express();
var httpServer = require('http').Server(app);
var https = require('https');
var path = require('path');
var RoomService = require('./modules/roomService.js');

var _certDir = path.resolve('cert');
var _viewsDir = path.resolve('views');
var _distDir = path.resolve('dist');

app.get('/', function (req, res) {
    res.sendFile(_viewsDir + '/index.html');
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

// var httpsServer = https.createServer({
//     pfx: fs.readFileSync(_certDir + '/dev_ip.pfx'),
//     passphrase: '123'
// }, app);
//
// httpsServer.listen(2727, function(){
//     console.log('listening on *:2727');
// });

var io = require('socket.io')(httpServer);

RoomService.init(io);

