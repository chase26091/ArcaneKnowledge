var fs = require('fs');
var sys = require("sys");
var io = require('../app.js').io;

var engine = require('../shared/engine.js');

var log4js = require('log4js');
var logger = log4js.getLogger();

/* Map hooks */
var mapName = 'Test';
var map = new engine.Map();
map.sockets = {};

var id = 0;

map.createId = function() {
  return id++;
};

map.addEntityMultiplayer = function(entity) {
  entity.local = false;
  map.addEntity(entity);
  io.emit('packet', new engine.AddEntityPacket(entity));
};

fs.readFile('./resources/maps/' + mapName + '.json', function(err, data) {
  if (err) {
    throw err;
  } else {
    map.loadMap(JSON.parse(data.toString()));

    id = map.idStart;
    logger.info(id);
  }
});

map.packetDefinitions[4] = function(packet) {
  var socket = this.sockets[packet.socketId];
  var clientPlayer = this.getEntity(packet.entityId);

  if (clientPlayer) {
    var move = clientPlayer.move(packet.up, packet.left, packet.down, packet.right);

    //send movement response to client
    socket.emit('packet', new engine.MovementResponsePacket(move.calculatedX, move.calculatedY));
    //send move to all clients
    socket.broadcast.emit('packet', new engine.MoveEntityPacket(packet.entityId, move.calculatedX, move.calculatedY));
  }
};

map.packetDefinitions[7] = function(packet) {
  var socket = this.sockets[packet.socketId];
  var clientPlayer = this.getEntity(packet.entityId);

  if (clientPlayer) {
    var projectile = clientPlayer.fireProjectile(packet.targetX, packet.targetY);
    logger.info('[Fire Projectile] id = ' + projectile.id);

    //send id update to client so its local id matches server's id
    socket.emit('packet', new engine.ChangeEntityIdPacket(packet.localId, projectile.id));
    //send add entity to the rest of listening clients so they have projectile
    socket.broadcast.emit('packet', new engine.AddEntityPacket(projectile));
  }
};

map.packetDefinitions[9] = function(packet) {
  var socket = this.sockets[packet.socketId];
  var clientPlayer = this.getEntity(packet.entityId);

  if (clientPlayer) {
    clientPlayer.castSpell(packet.spellType);

    var response = new engine.CastSpellPacket(packet.spellType, packet.properties);
    response.casterId = packet.entityId;

    socket.broadcast.emit('packet', response);
  }

  console.log('[Cast Spell] spellType = ' + packet.spellType);
};
/* Map Hooks */

var packetQueue = [];

io.on('connection', function(socket) {
  logger.info('[Connect] id = ' + socket.id);
  map.sockets[socket.id] = socket;

  //send map name and start loading it
  socket.emit('packet', new engine.MapNamePacket(mapName));

  // send all existing entites to client
  for (var key in map.entities) {
    var entity = map.entities[key];

    if (entity && entity.local === false)
      socket.emit('packet', new engine.AddEntityPacket(map.entities[key]));
  }

  // add player to all clients
  var player = new engine.Player(map.createId(), map, 522, 0, 0, {
    'name': 'player'
  });
  map.addEntityMultiplayer(player);

  //attach player to socket
  socket.entityId = player.id;

  // send client their id
  socket.emit('packet', new engine.ClientIdPacket(player.id));

  socket.on('disconnect', function() {
    logger.info('[Disconnect] id = ' + socket.id);
    io.emit('packet', new engine.RemoveEntityPacket(player.id));
    map.removeEntity(player.id);
    delete map.sockets[player.id];
  });

  socket.on('packet', function(packet) {
    if (!packet) {
      console.log('Recieved an empty packet!');
      return;
    }

    packet.entityId = socket.entityId;
    packet.socketId = socket.id;
    packetQueue.push(packet);
  });
});

/* Game Loop */
var tickLengthMs = 1000 / 20;
var previousTick = engine.timestamp();
var actualTicks = 0;

var start = engine.timestamp();
var fps = 0;

var gameLoop = function() {
  var now = engine.timestamp();

  actualTicks++;
  if (previousTick + tickLengthMs <= now) {
    var delta = (now - previousTick) / 1000;
    previousTick = now;

    update(delta);
    fps++;

    if (engine.timestamp() - start >= 1000) {
      start = engine.timestamp();
      fps = 0;
    }

    actualTicks = 0;
  }

  if (engine.timestamp() - previousTick < tickLengthMs - 16) {
    setTimeout(gameLoop);
  } else {
    setImmediate(gameLoop);
  }
};

var update = function(delta) {
  map.update();

  for (var i = 0; i < packetQueue.length; i++) {
    map.processPacket(packetQueue.shift());
  }
};

gameLoop();
/* Game Loop */


/* Console Commands */
var getSocketCount = function() {
  return Object.keys(map.sockets).length;
};

var getEntityCount = function() {
  return Object.keys(map.entities).length;
};

var consoleCommands = {
  "/socketcount": getSocketCount,
  "/entitycount": getEntityCount
};

var stdin = process.openStdin();

stdin.addListener("data", function(d) {
  var input = d.toString().substring(0, d.length - 1);

  if (consoleCommands[input]) {
    console.log(consoleCommands[input]());
  } else {
    logger.warn("not a command! : [" + input + "]");

  }
});
/* Console Commands */