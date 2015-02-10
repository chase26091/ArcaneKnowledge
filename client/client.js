var addEffect = function(effect) {
	EffectHandler.addEffect(effect);
	world.addChild(effect);
};

/* World and Stage Setup */
var stage = new PIXI.Stage(0x66FF99);

var world = new PIXI.DisplayObjectContainer();
world.setInteractive(true);
world.mousedown = function(mouseData) {
	handleUserMouseDown(mouseData);
};

var width = 1000;
var height = 600;

var renderer = PIXI.autoDetectRenderer(width, height);
document.body.appendChild(renderer.view);

stage.addChild(world);

function depthCompare(a, b) {
		if (a.z < b.z)
			return -1;
		if (a.z > b.z)
			return 1;
		return 0;
	}
	/* World and Stage Setup */


/* Map Setup */
var socket;
var map = new engine.Map();

var id = 0;

map.createId = function() {
	return "@" + id++; //local ids on client only!
};

map.addEntity = function(entity) {
	this.entities[entity.id] = entity;

	var sprite = PIXI.Sprite.fromFrame(entity.spriteId);
	sprite.z = entity.z;

	if (!sprite)
		console.log('Unable to find sprite frame for sprite id:' + entity.spriteId);
	else if (entity.name) {

		var name = new PIXI.Text(entity.name, {
			font: "10px gameFont",
			fill: "black"
		});

		name.position.y = 30;
		sprite.addChild(name);
	}

	entity.attachSprite(sprite);
	world.addChild(sprite);
	world.children.sort(depthCompare);
};

map.removeEntity = function(id) {
	var entity = this.getEntity(id);

	if (entity && entity.sprite){
		world.removeChild(entity.sprite);
	}

	delete this.entities[id];
};

map.packetDefinitions[0] = function(packet) {
	var entityClass = engine.entityDefinitions[packet.entityType];
	var entity = new entityClass(packet.id, this, packet.spriteId, packet.x, packet.y, packet.properties);
	this.addEntity(entity);

	console.log('[Add Entity] id = ' + packet.id);
};

map.packetDefinitions[1] = function(packet) {
	this.removeEntity(packet.id);

	console.log('[Remove Entity] id = ' + packet.id);
};

map.packetDefinitions[2] = function(packet) {
	var entity = this.getEntity(packet.id);
	entity.setPosition(packet.x, packet.y);

	console.log('[Set Position] id = ' + packet.id + ' , x = ' + packet.x + ' , y = ' + packet.y);
};

map.packetDefinitions[3] = function(packet) {
	var clientId = packet.id;
	this.setClientPlayer(clientId);

	console.log('[Set Client Player] id = ' + packet.id);
};

map.packetDefinitions[5] = function(packet) {
	var movementInputPacket = this.movementInputQueue.shift();

	if (movementInputPacket.calculatedX !== packet.calculatedX || movementInputPacket.calculatedY !== packet.calculatedY) {
		this.getClientPlayer().setPosition(packet.calculatedX, packet.calculatedY);
	}
};

map.packetDefinitions[6] = function(packet) {
	var context = this;
	$.getJSON('/resources/maps/' + packet.mapName + '.json', function(data) {
		context.loadMap(data);
	});

	console.log('[Load Map] mapName = ' + packet.mapName);
};

map.packetDefinitions[8] = function(packet) {
	var entity = this.getEntity(packet.oldId);

	if (entity) {
		entity.id = packet.newId;
		delete this.entities[packet.oldId];
		this.entities[packet.newId] = entity;
	}

	console.log('[Change Entity Id] oldId = ' + packet.oldId + ' , newId = ' + packet.newId);
};

map.packetDefinitions[9] = function(packet) {
	var caster = this.getEntity(packet.casterId);

	if (caster) {
		caster.castSpell(packet.spellType, packet.properties);
	}

	console.log('[Cast Spell Packet] casterId = ' + packet.casterId + ', spellType = ' + packet.spellType);
};

/* Map Setup */

var loader = new PIXI.AssetLoader(['/resources/assets.json']);

loader.onComplete = function() {
	socket = io(document.url);
	socket.on('packet', function(packet) {
		packet.queueTime = engine.timestamp();
		map.addPacket(packet);
	});

	/* Engine Hooks */
	engine.Mob.prototype.onHurtCallback = function(hurtingEntity, damage) {
		var effect = new DamageText(damage, this.x, this.y);
		addEffect(effect);
	};
	/* Engine Hooks */

	requestAnimFrame(frame);
};

loader.load();

var now,
	fps = 0,
	start = engine.timestamp(),
	dt = 0,
	last = engine.timestamp(),
	step = 1 / 60;

var update = function(step) {
	//synchronize viewport
	map.setCamera({
		x: -world.position.x,
		y: -world.position.y,
		w: width,
		h: height
	});

	//update effects
	updateEffects();

	//update map
	map.update();

	//center camera
	updateCamera();

	//get user input
	handleUserMovement();
};

var updateEffects = function() {
	var i = EffectHandler.effects.length;
	var effect;
	while (i--) {
		effect = EffectHandler.effects[i];
		effect.update();

		if (effect.requestingRemoval) {
			world.removeChild(EffectHandler.effects.splice(i, 1)[0]);
		}
	}
};

var updateCamera = function() {
	var player = map.getClientPlayer();

	if (player) {
		world.position.x = -player.x + (width / 2);
		world.position.y = -player.y + (height / 2);
	}
};

var handleUserMouseDown = function(mouseData) {
	var localPosition = mouseData.getLocalPosition(world);

	var player = map.getClientPlayer();

	if (player) {
		var projectile = player.fireProjectile(localPosition.x, localPosition.y);
		if (projectile) {
			var createdId = projectile.id;
			socket.emit('packet', new engine.FireProjectilePacket(createdId, localPosition.x, localPosition.y));
		}
	}
};

var handleUserMovement = function() {
	var player = map.getClientPlayer();

	if (!player)
		return;

	//keyboard movement
	var up = Key.isDown(Key.UP) || Key.isDown(Key.W);
	var left = Key.isDown(Key.LEFT) || Key.isDown(Key.A);
	var down = Key.isDown(Key.DOWN) || Key.isDown(Key.S);
	var right = Key.isDown(Key.RIGHT) || Key.isDown(Key.D);

	if (up || left || down || right) {
		socket.emit('packet', map.addMovementInput(up, left, down, right));
	}


	if (Key.isDown(Key.R)) {

		var spellType = 0;

		if (player.castSpell(spellType)) {
			console.log('[Cast Spell] spellType = ' + spellType);
			socket.emit('packet', new engine.CastSpellPacket(spellType));
		}
	}
};

var render = function(dt) {
	renderer.render(stage);
};

var frame = function() {
	now = engine.timestamp();
	dt = dt + Math.min(1, (now - last) / 1000);
	while (dt > step) {
		dt = dt - step;
		update(step);
		fps++;

		if ((engine.timestamp() - start) >= 1000) {
			//console.log(fps);
			fps = 0;
			start = engine.timestamp();
		}
	}
	render(dt);
	last = now;
	requestAnimationFrame(frame);
};