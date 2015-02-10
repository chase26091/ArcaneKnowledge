Effect = function(text, x, y, properties) {

	if(!properties)
		properties = {};

	if(!properties.font)
		properties.font = "32px gameFont";

	PIXI.Text.call(this, text, properties);

	this.position.x = x;
	this.position.y = y;
	this.z = 2;

	this.requestingRemoval = false;
	this.time = 0;

	console.log(this);
};

Effect.prototype = Object.create(PIXI.Text.prototype);

Effect.prototype.constructor = Effect;

Effect.prototype.remove = function() {
	this.requestingRemoval = true;
};

Effect.prototype.update = function() {
	this.time++;
	if (this.time >= 30) {
		this.remove();
	}

	this.position.y--;
};

DamageText = function(text, x, y){
	Effect.call(this, text, x, y, {fill:'red'});
};

DamageText.prototype = Object.create(Effect.prototype);

DamageText.prototype.constructor = DamageText;

var EffectHandler = {
	effects: [],
	addEffect: function(effect){
		this.effects.push(effect);
	}
};