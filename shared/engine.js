 
(function(exports) {

	exports.timestamp = function() {
		return new Date().getTime();
	};

	timestamp = function() {
		return new Date().getTime();
	};

	intersects = function(a, b) {
		return (!((a.x + a.w) < b.x || (a.y + a.h) < b.y || a.x > (b.x + b.w) || a.y > (b.y + b.h)));
	};

	getIntersection = function(a, b) {
		var output = {};

		if (a.w >= 0 && a.h >= 0 && b.w >= 0 && b.h >= 0) {
			if (!((a.x + a.w) < b.x || (a.y + a.h) < b.y || a.x > (b.x + b.w) || a.y > (b.y + b.h))) {
				output.x = Math.max(a.x, b.x);
				output.y = Math.max(a.y, b.y);
				output.w = Math.min(a.x + a.w, b.x + b.w) - output.x;
				output.h = Math.min(a.y + a.h, b.y + b.h) - output.y;
			} else {
				return null;
			}
		}

		return output;
	};

	QuadTree = function(args) {

		var node;
		var TOP_LEFT = 0;
		var TOP_RIGHT = 1;
		var BOTTOM_LEFT = 2;
		var BOTTOM_RIGHT = 3;
		var PARENT = 4;

		// assign default values
		args.maxChildren = args.maxChildren || 2;
		args.maxDepth = args.maxDepth || 4;

		/**
		 * Node creator. You should never create a node manually. the algorithm takes
		 * care of that for you.
		 */
		node = function(x, y, w, h, depth, maxChildren, maxDepth) {

			var items = [], // holds all items
				nodes = []; // holds all child nodes

			// returns a fresh node object
			return {

				x: x, // top left point
				y: y, // top right point
				w: w, // width
				h: h, // height
				depth: depth, // depth level of the node

				/**
				 * iterates all items that match the selector and invokes the supplied callback on them.
				 */
				retrieve: function(item, callback, instance) {
					for (var i = 0; i < items.length; ++i) {
						(instance) ? callback.call(instance, items[i]): callback(items[i]);
					}
					// check if node has subnodes
					if (nodes.length) {
						// call retrieve on all matching subnodes
						this.findOverlappingNodes(item, function(dir) {
							nodes[dir].retrieve(item, callback, instance);
						});
					}
				},

				/**
				 * Adds a new Item to the node.
				 *
				 * If the node already has subnodes, the item gets pushed down one level.
				 * If the item does not fit into the subnodes, it gets saved in the
				 * "children"-array.
				 *
				 * If the maxChildren limit is exceeded after inserting the item,
				 * the node gets divided and all items inside the "children"-array get
				 * pushed down to the new subnodes.
				 */
				insert: function(item) {

					var i;

					if (nodes.length) {
						// get the node in which the item fits best
						i = this.findInsertNode(item);
						if (i === PARENT) {
							// if the item does not fit, push it into the
							// children array
							items.push(item);
						} else {
							nodes[i].insert(item);
						}
					} else {
						items.push(item);
						//divide the node if maxChildren is exceeded and maxDepth is not reached
						if (items.length > maxChildren && this.depth < maxDepth) {
							this.divide();
						}
					}
				},

				/**
				 * Find a node the item should be inserted in.
				 */
				findInsertNode: function(item) {
					// left
					if (item.x + item.w < x + (w / 2)) {
						if (item.y + item.h < y + (h / 2)) {
							return TOP_LEFT;
						}
						if (item.y >= y + (h / 2)) {
							return BOTTOM_LEFT;
						}
						return PARENT;
					}

					// right
					if (item.x >= x + (w / 2)) {
						if (item.y + item.h < y + (h / 2)) {
							return TOP_RIGHT;
						}
						if (item.y >= y + (h / 2)) {
							return BOTTOM_RIGHT;
						}
						return PARENT;
					}

					return PARENT;
				},

				/**
				 * Finds the regions the item overlaps with. See constants defined
				 * above. The callback is called for every region the item overlaps.
				 */
				findOverlappingNodes: function(item, callback) {
					// left
					if (item.x < x + (w / 2)) {
						if (item.y < y + (h / 2)) {
							callback(TOP_LEFT);
						}
						if (item.y + item.h >= y + h / 2) {
							callback(BOTTOM_LEFT);
						}
					}
					// right
					if (item.x + item.w >= x + (w / 2)) {
						if (item.y < y + (h / 2)) {
							callback(TOP_RIGHT);
						}
						if (item.y + item.h >= y + h / 2) {
							callback(BOTTOM_RIGHT);
						}
					}
				},

				/**
				 * Divides the current node into four subnodes and adds them
				 * to the nodes array of the current node. Then reinserts all
				 * children.
				 */
				divide: function() {
					var width, height, i, oldChildren;
					var childrenDepth = this.depth + 1;
					// set dimensions of the new nodes
					width = (w / 2);
					height = (h / 2);
					// create top left node
					nodes.push(node(this.x, this.y, width, height, childrenDepth, maxChildren, maxDepth));
					// create top right node
					nodes.push(node(this.x + width, this.y, width, height, childrenDepth, maxChildren, maxDepth));
					// create bottom left node
					nodes.push(node(this.x, this.y + height, width, height, childrenDepth, maxChildren, maxDepth));
					// create bottom right node
					nodes.push(node(this.x + width, this.y + height, width, height, childrenDepth, maxChildren, maxDepth));

					oldChildren = items;
					items = [];
					for (i = 0; i < oldChildren.length; i++) {
						this.insert(oldChildren[i]);
					}
				},

				/**
				 * Clears the node and all its subnodes.
				 */
				clear: function() {
					var i;
					for (i = 0; i < nodes.length; i++) {
						nodes[i].clear();
					}
					items.length = 0;
					nodes.length = 0;
				},

				/*
				 * convenience method: is not used in the core algorithm.
				 * ---------------------------------------------------------
				 * returns this nodes subnodes. this is usful if we want to do stuff
				 * with the nodes, i.e. accessing the bounds of the nodes to draw them
				 * on a canvas for debugging etc...
				 */
				getNodes: function() {
					return nodes.length ? nodes : false;
				}
			};
		};

		return {

			root: (function() {
				return node(args.x, args.y, args.w, args.h, 0, args.maxChildren, args.maxDepth);
			}()),

			insert: function(item) {

				var len, i;

				if (item instanceof Array) {
					len = item.length;
					for (i = 0; i < len; i++) {
						this.root.insert(item[i]);
					}

				} else {
					this.root.insert(item);
				}
			},

			retrieve: function(selector, callback, instance) {
				return this.root.retrieve(selector, callback, instance);
			},

			clear: function() {
				this.root.clear();
			}
		};
	};

	/* Simple JavaScript Inheritance
	 * By John Resig http://ejohn.org/
	 * MIT Licensed.
	 */
	// Inspired by base2 and Prototype
	(function() {
		var initializing = false,
			fnTest = /xyz/.test(function() {
				xyz;
			}) ? /\b_super\b/ : /.*/;

		// The base Class implementation (does nothing)
		this.Class = function() {};

		// Create a new Class that inherits from this class
		Class.extend = function(prop) {
			var _super = this.prototype;

			// Instantiate a base class (but only create the instance,
			// don't run the init constructor)
			initializing = true;
			var prototype = new this();
			initializing = false;

			// Copy the properties over onto the new prototype
			for (var name in prop) {
				// Check if we're overwriting an existing function
				prototype[name] = typeof prop[name] == "function" &&
					typeof _super[name] == "function" && fnTest.test(prop[name]) ?
					(function(name, fn) {
						return function() {
							var tmp = this._super;

							// Add a new ._super() method that is the same method
							// but on the super-class
							this._super = _super[name];

							// The method only need to be bound temporarily, so we
							// remove it when we're done executing
							var ret = fn.apply(this, arguments);
							this._super = tmp;

							return ret;
						};
					})(name, prop[name]) :
					prop[name];
			}

			// The dummy class constructor
			function Class() {
				// All construction is actually done in the init method
				if (!initializing && this.init)
					this.init.apply(this, arguments);
			}

			// Populate our constructed prototype object
			Class.prototype = prototype;

			// Enforce the constructor to be what we expect
			Class.prototype.constructor = Class;

			// And make this class extendable
			Class.extend = arguments.callee;

			return Class;
		};
	})();

	//Packets
	Packet = Class.extend({
		init: function(packetType) {
			this.packetType = packetType;
			this.lerp = false;
			this.queueTime = null;
		}
	});

	exports.AddEntityPacket = Packet.extend({
		init: function(entity) {
			this._super(0);
			this.entityType = entity.entityType;
			this.id = entity.id;
			this.spriteId = entity.spriteId;
			this.x = entity.x;
			this.y = entity.y;
			this.z = entity.z;
			this.properties = entity.properties;
		}
	});

	exports.RemoveEntityPacket = Packet.extend({
		init: function(id) {
			this._super(1);
			this.id = id;
		}
	});

	exports.MoveEntityPacket = Packet.extend({
		init: function(id, x, y) {
			this._super(2);
			this.lerp = true;

			this.id = id;
			this.x = x;
			this.y = y;
		}
	});

	exports.ClientIdPacket = Packet.extend({
		init: function(id) {
			this._super(3);
			this.id = id;
		}
	});

	exports.MovementInputPacket = Packet.extend({
		init: function(calculatedX, calculatedY, up, left, down, right) {
			this._super(4);
			this.calculatedX = calculatedX;
			this.calculatedY = calculatedY;
			this.up = up;
			this.left = left;
			this.down = down;
			this.right = right;
		}
	});

	exports.MovementResponsePacket = Packet.extend({
		init: function(calculatedX, calculatedY) {
			this._super(5);
			this.calculatedX = calculatedX;
			this.calculatedY = calculatedY;
		}
	});

	exports.MapNamePacket = Packet.extend({
		init: function(mapName) {
			this._super(6);
			this.mapName = mapName;
		}
	});

	exports.FireProjectilePacket = Packet.extend({
		init: function(localId, targetX, targetY) {
			this._super(7);
			this.lerp = true;

			this.localId = localId;
			this.targetX = targetX;
			this.targetY = targetY;
		}
	});

	exports.ChangeEntityIdPacket = Packet.extend({
		init: function(oldId, newId) {
			this._super(8);
			this.oldId = oldId;
			this.newId = newId;
		}
	});

	exports.CastSpellPacket = Packet.extend({
		init: function(spellType, properties) {
			this._super(9);
			this.spellType = spellType;
			this.properties = properties;
		}
	});

	Spell = Class.extend({
		init: function(spellType, owner, properties) {
			this.spellType = spellType;
			this.owner = owner;
			this.properties = properties;

			this.cooldown = 1000;
			this.lastCastTime = -1;
		},
		cast: function(properties) {
			if (this.lastCastTime == -1) {
				this.lastCastTime = timestamp();
				return true;
			}

			var castTime = timestamp();
			if ((timestamp() - this.lastCastTime) >= this.cooldown) {
				this.lastCastTime = castTime;
				return true;
			} else {
				return false;
			}
		}
	});

	exports.FireBallSpell = Spell.extend({
		init: function(owner, properties) {
			this._super(0, owner, properties);
		},
		cast: function(properties) {
			if (this._super(properties)) {				
				this.owner.fireProjectile(this.owner.x + 100, this.owner.y);
				this.owner.fireProjectile(this.owner.x - 100, this.owner.y);
				this.owner.fireProjectile(this.owner.x, this.owner.y + 100);
				this.owner.fireProjectile(this.owner.x, this.owner.y - 100);

				return true;
			}

			return false;
		}
	});

	//Entities
	Entity = Class.extend({
		init: function(entityType, id, map, spriteId, x, y, z, w, h, properties) {
			this.entityType = entityType;
			this.id = id;
			this.map = map;
			this.spriteId = spriteId; //entities start at 512
			this.x = x || 0;
			this.y = y || 0;
			this.z = z || 0;
			this.w = w || 32;
			this.h = h || 32;
			this.speed = 5;
			this.properties = properties || null;

			this.requestingRemoval = false;
			this.collidable = false;
		},
		onRemove: function() {
			//entity obligation!
		},
		remove: function() {
			this.requestingRemoval = true;
		},
		updateVisibility: function() {
			if (!this.sprite)
				return;

			if (this.map.camera && intersects(this, this.map.camera)) {
				this.sprite.visibile = true;
			} else {
				this.sprite.visibile = false;
			}
		},
		update: function() {
			this.updateVisibility();
		},
		onOutOfBounds: function(){
			//entity obligation
		},
		onCollision: function(collisionEntity, intersection) {
			//entity obligation!
		},
		moveTo: function(destinationX, destinationY) {
			this.x = destinationX;
			this.y = destinationY;

			if (this.map.quadtree) {

				var entity = this;

				this.map.quadtree.retrieve(entity, function(collision) {
					if (collision === entity)
						return;

					var intersection = getIntersection(entity, collision);

					if (intersection !== null) {
						entity.onCollision(collision, getIntersection(entity, collision));
					}
				});

			} else {
				console.log('no quad tree!');
			}

			var outOfBounds = false;

			if (this.x < 0) {
				this.x = 0;
				outOfBounds = true;
			} else if (this.x > (this.map.maxWidth - this.w)) {
				this.x = (this.map.maxWidth - this.w);
				outOfBounds = true;
			}

			if (this.y < 0) {
				this.y = 0;
				outOfBounds = true;
			} else if (this.y > (this.map.maxHeight - this.h)) {
				this.y = (this.map.maxHeight - this.h);
				outOfBounds = true;
			}


			if(outOfBounds)
				this.onOutOfBounds();

			this.setPosition(this.x, this.y);
			return {
				calculatedX: this.x,
				calculatedY: this.y
			};

		},
		getEntityType: function() {
			return this.entityType;
		},
		attachSprite: function(sprite) {
			this.sprite = sprite;
			this.setPosition(this.x, this.y);
		},
		setPosition: function(x, y) {
			this.x = x;
			this.y = y;

			if (this.sprite) {
				this.sprite.x = this.x;
				this.sprite.y = this.y;
			}
		}
	});

	Mob = Entity.extend({
		init: function(entityType, id, map, spriteId, x, y, z, w, h, properties) {
			this._super(entityType, id, map, spriteId, x, y, 1, 32, 32, properties);
			this.collidable = true;
			this.spellBook = {
				0: new exports.FireBallSpell(this)
			};

			if (this.properties) {
				this.name = this.properties.name || null;
			}
		},
		onCollision: function(collisionEntity, intersection) {
			this._super(collisionEntity, intersection);

			if (intersection !== null) {
				var absDepthX = Math.abs(intersection.w);
				var absDepthY = Math.abs(intersection.h);

				if (absDepthY < absDepthX) {
					if (intersection.y > this.y)
						this.y -= intersection.h;
					else
						this.y += intersection.h;
				} else {
					if (intersection.x > this.x)
						this.x -= intersection.w;
					else
						this.x += intersection.w;
				}
			}

			this.setPosition(this.x, this.y);
		},
		castSpell: function(spellType, properties) {
			if (this.spellBook) {
				var spell = this.spellBook[spellType];

				if (spell) {
					return spell.cast(properties);
				} else {
					console.log('Couldnt find type : ' + spellType + ' spell!');
				}
			} else {
				console.log('No spell book!');
			}

			return false;
		},
		fireProjectile: function(targetX, targetY) {
			var projectile = new exports.Projectile(this.map.createId(), this.map, 300, this.x, this.y, {
				ownerId: this.id,
				targetX: targetX,
				targetY: targetY
			});

			this.map.addEntity(projectile);

			return projectile;
		}
	});

	exports.Player = Mob.extend({
		init: function(id, map, spriteId, x, y, properties) {
			this._super(1, id, map, spriteId, x, y, 1, 32, 32, properties);
		},
		move: function(up, left, down, right) {
			var newX = this.x;
			var newY = this.y;

			if (up) newY -= this.speed;
			if (left) newX -= this.speed;
			if (down) newY += this.speed;
			if (right) newX += this.speed;

			return this.moveTo(newX, newY);
		}
	});

	exports.Tile = Entity.extend({
		init: function(id, map, spriteId, x, y, properties) {
			this._super(2, id, map, spriteId, x, y, 0, 32, 32, properties);

			if (this.properties) {
				this.collidable = this.properties.collidable || false;
			}
		}
	});

	exports.Projectile = Entity.extend({
		init: function(id, map, spriteId, x, y, properties) {
			this._super(3, id, map, spriteId, x, y, 1, 32, 32, properties);
			//this.collidable = true;
			this.speed = 6;
			this.maxDistance = 600;

			this.originX = this.x;
			this.originY = this.y;

			this.ownerId = properties.ownerId;
			this.targetX = properties.targetX;
			this.targetY = properties.targetY;
			this.angle = Math.atan2((this.targetY - this.y), (this.targetX - this.x));
			this.velocityX = Math.cos(this.angle) * this.speed;
			this.velocityY = Math.sin(this.angle) * this.speed;
		},
		onOutOfBounds: function(){
			this.remove();
		},
		onCollision: function(collisionEntity, intersection) {
			if (collisionEntity.id === this.ownerId)
				return;
			else {
				this.remove();
			}
		},
		getDistanceTraveled: function() {
			return Math.abs(this.originX - this.x) + Math.abs(this.originY - this.y);
		},
		update: function() {
			this._super();

			this.moveTo(this.x + this.velocityX, this.y + this.velocityY);
			if (this.getDistanceTraveled() >= this.maxDistance) {
				this.remove();
			}
		}
	});

	//Entity definitions
	exports.entityDefinitions = [];
	exports.entityDefinitions[1] = exports.Player;
	exports.entityDefinitions[2] = exports.Tile;
	exports.entityDefinitions[3] = exports.Projectile;

	//Map
	exports.Map = Class.extend({
		init: function(socket) {
			this.socket = socket;
			this.entities = {};
			this.packetDefinitions = [];
			this.movementInputQueue = [];
			this.clientPlayer = null;
			this.quadtree = null;
			this.tileproperties = {};
			this.camera = null;
			this.idStart = 0;
		},
		createId: function() {
			return -1; //client, server obligation
		},
		setCamera: function(camera) {
			this.camera = camera;
		},
		getTileProperties: function(id) {
			if (this.tileproperties[id]) {
				return this.tileproperties[id];
			}

			return null;
		},
		loadMap: function(mapData) {
			this.height = mapData.height;
			this.width = mapData.width;

			this.maxHeight = this.height * 32;
			this.maxWidth = this.width * 32;

			var args = {
				x: 0,
				y: 0,
				h: this.height * 32,
				w: this.width * 32
			};

			this.quadtree = QuadTree(args);

			for (var u = 0; u < mapData.tilesets.length; u++) {
				for (var key in mapData.tilesets[u].tileproperties) {
					this.tileproperties[key] = mapData.tilesets[u].tileproperties[key];
				}
			}

			for (var i = 0; i < mapData.layers.length; i++) {
				var data = mapData.layers[i].data;
				this.idStart += data.length;

				var x = 0;
				var y = 0;
				var rowCount = 0;

				for (var j = 0; j < data.length; j++) {

					var tileSpriteId = (data[j] - 1);

					var tileProperties = this.getTileProperties(tileSpriteId);

					this.addEntity(new exports.Tile(j, this, tileSpriteId, x * 32, y * 32, tileProperties));

					rowCount++;

					if (rowCount == this.width) {
						rowCount = 0;
						x = 0;
						y++;
					} else {
						x++;
					}
				}

			}

		},
		addMovementInput: function(up, left, down, right) {
			var clientPlayer = this.getClientPlayer();

			if (!clientPlayer) {
				console.log('Trying to move yet no client player :(');
				return;
			}

			var move = clientPlayer.move(up, left, down, right);
			var movementInputPacket = new engine.MovementInputPacket(move.calculatedX, move.calculatedY,
				up, left, down, right);
			this.movementInputQueue.push(movementInputPacket);
			return movementInputPacket;
		},
		setClientPlayer: function(id) {
			this.clientPlayer = this.getEntity(id);
		},
		getClientPlayer: function() {
			return this.clientPlayer;
		},
		getEntity: function(id) {
			return this.entities[id];
		},
		addEntity: function(entity) {
			this.entities[entity.id] = entity;
		},
		removeEntity: function(id) {
			delete this.entities[id];
		},
		addPacket: function(packet) {
			if (packet.lerp) {
				setTimeout(this.processPacket(packet), 100);
			} else {
				this.processPacket(packet);
			}
		},
		update: function() {
			var entity;
			var key;

			if (this.quadtree) {
				this.quadtree.clear();

				for (key in this.entities) {
					entity = this.entities[key];

					if (entity && entity.collidable)
						this.quadtree.insert(entity);
				}
			}

			for (key in this.entities) {
				entity = this.entities[key];

				if (entity) {
					entity.update();

					if (entity.requestingRemoval) {
						entity.onRemove();
						this.removeEntity(key);
					}
				}
			}
		},
		processPacket: function(packet) {
			if (packet.packetType !== undefined) {

				var packetDefintion = this.packetDefinitions[packet.packetType];

				if (packetDefintion) {
					packetDefintion.call(this, packet);
				}
			} else {
				console.log("[Missing packet type]" + packet);
			}
		}
	});
})(typeof exports === 'undefined' ? this.engine = {} : exports);