var express = require('express');
var app = express();
var server = require('http').Server(app);
exports.io = require('socket.io')(server);
var gameServer = require('./server/server.js');

app.use('/client', express.static(__dirname + '/client'));
app.use('/shared', express.static(__dirname + '/shared'));
app.use('/resources', express.static(__dirname + '/resources'));
app.use('/tools', express.static(__dirname + '/tools/tools.html'));

server.listen(80);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

