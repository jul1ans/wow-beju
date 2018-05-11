
var express = require('express');
var app = express();
var http = require('http').Server(app);
var path = require('path');
var io = require('socket.io')(http);

var _viewsDir = path.resolve('views');
var _distDir = path.resolve('dist');

app.get('/', function (req, res){
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

http.listen(2727, function(){
    console.log('listening on *:2727');
});

io.on('connection', function(socket){
    console.log('a user connected');

    socket.on('deviceorientation', function(event){
        socket.broadcast.emit('change', event);
    });
});

