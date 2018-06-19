var fs = require('fs');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var https = require('https');
var path = require('path');

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

console.log('C:', fs.readFileSync('sslcert/server.key', 'utf8'));

var httpsServer = https.createServer({
    key: '', // fs.readFileSync('sslcert/server.key', 'utf8')
    certificate: '' // fs.readFileSync('sslcert/server.crt', 'utf8')
}, app);

httpsServer.listen(2727, function(){
    console.log('listening on *:2727');
});

var io = require('socket.io')(httpsServer);

io.on('connection', function(socket){
    console.log('a user connected');

    socket.on('deviceorientation', function(event){
        socket.broadcast.emit('change', event);
    });
});

