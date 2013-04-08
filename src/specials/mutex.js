Crafty.c("Mutex", {
	v1: new Crafty.math.Vector2D(),
	v2: new Crafty.math.Vector2D(),
		
	init: function() {
		this.bind("Remove", this._mutex_onRemove).requires("2D, CustomDraw")
		.bind(R.States.playerMovement, this._mutex_onPlayerMovement)
		.attr({
			x: 0,
			y: 0,
			locks: [],
			keys: [],
			baseColor: "#222222",
			symbolColor: "#FFFF00",
			lineWidth: 5,		
			mutexRadius: 40,
			isLocked: false,
			_mutex_maxX: -Number.MAX_VALUE,
			_mutex_maxY: -Number.MAX_VALUE,
		});	
		this.drawFunctions.push(this._mutex_draw);
	},
	
	mutex_addLock: function(lock) {
		this.locks.push(lock);
		this._mutex_updateDimensions(lock);
	},
	
	mutex_addKey: function(key) {
		this.keys.push(key);
		this._mutex_updateDimensions(key);
	},

	mutex_applySettings: function() {
		var baseX = this._parent.graphdraw_vertexBaseX;
		var baseY = this._parent.graphdraw_vertexBaseY;
		
		this.w = this._mutex_maxX - baseX + 2*this.mutexRadius + this.lineWidth;
		this.h = this._mutex_maxY - baseY + 2*this.mutexRadius + this.lineWidth;
		this.x = this._parent.x + this._parent.lineWidth/2 - this.mutexRadius - this.lineWidth/2;
		this.y = this._parent.y + this._parent.lineWidth/2 - this.mutexRadius - this.lineWidth/2;
	},
		
	_mutex_updateDimensions: function(v) {
		this._mutex_maxX = Math.max(this._mutex_maxX, v.x);
		this._mutex_maxY = Math.max(this._mutex_maxY, v.y);
		this.mutex_applySettings();
	},
	
	_mutex_onRemove: function() {
		this.unbind(R.States.playerMovement, this._mutex_onPlayerMovement);
		this.keys.length = 0;
		this.locks.length = 0;
		delete this.keys;
		delete this.locks;
		delete this.v1;
		delete this.v2;
	},
	
	_mutex_onPlayerMovement: function(player) {
		var base = this._parent.graphdraw_vertexBase();
		
		var v1 = this.v1;
		var v2 = this.v2;
		
		v1.x = player.centerX();
		v1.y = player.centerY();
		
		var diffSquared = Math.pow(this.mutexRadius + player.w/2, 2);
		for (var i = 0; i < this.locks.length; ++i) {
			v2.x = base._x + this.locks[i].x;
			v2.y = base._y + this.locks[i].y;

			if (v2.subtract(v1).magnitudeSq() < diffSquared) {
				this.isLocked = true;
				return;
			}
		}
		
		for (var i = 0; i < this.keys.length; ++i) {
			v2.x = base._x + this.keys[i].x;
			v2.y = base._y + this.keys[i].y;
			
			if (v2.subtract(v1).magnitudeSq() < diffSquared) {
				this.isLocked = false;
				return;
			}
		}
	},
	
	_mutex_draw: function(data) {
		var ctx = data.ctx;
		var transX = data.pos._x - this._parent.graphdraw_vertexBaseX + this.mutexRadius + this.lineWidth/2;
		var transY = data.pos._y - this._parent.graphdraw_vertexBaseY + this.mutexRadius + this.lineWidth/2;
		var lockSymbol = (this.isLocked) ? this._mutex_drawX : this._mutex_drawCircle;
				
		ctx.save();
		ctx.lineWidth = this.lineWidth;
		ctx.strokeStyle = this.symbolColor;
		ctx.fillStyle = this.baseColor;

		//ctx.globalAlpha = 0.5;
		//ctx.fillRect(data.pos._x, data.pos._y, data.pos._w, data.pos._h);
		//ctx.globalAlpha = 1.0;
		
		ctx.translate(transX, transY);
			
		for (var i = 0; i < this.locks.length; ++i) {
			var l = this.locks[i];
			this._mutex_drawCircle(ctx, l.x, l.y, this.mutexRadius, "fill");
			lockSymbol.call(this, ctx, l.x, l.y, this.mutexRadius * .55, "stroke");
		}
		
		for (var i = 0; i < this.keys.length; ++i) {
			var k = this.keys[i];
			this._mutex_drawCircle(ctx, k.x, k.y, this.mutexRadius, "fill");
			this._mutex_drawCircle(ctx, k.x, k.y, this.mutexRadius * .55, "stroke");
			this._mutex_drawX(ctx, k.x, k.y, this.mutexRadius * .55);
		}

		ctx.translate(-transX, -transY);
		ctx.restore();
	},
	
	_mutex_drawCircle: function(ctx, x, y, r, drawFunc) {
		r -= this.lineWidth/2
		ctx.beginPath();
		ctx.save();
		ctx.scale(r, r);
		ctx.beginPath();
		ctx.arc(x / r, y / r, 1, 0, Math.PI*2, false);
		ctx.restore();	
		ctx.closePath();
		ctx[drawFunc]();	
	},
	
	_mutex_drawX: function(ctx, x, y, strokeHalfLength) {
		strokeHalfLength -= this.lineWidth/2;
		ctx.beginPath();

		ctx.moveTo(x + strokeHalfLength, y + strokeHalfLength);
		ctx.lineTo(x - strokeHalfLength, y - strokeHalfLength);
			
		// Top left to bottom right
		ctx.moveTo(x - strokeHalfLength, y + strokeHalfLength);
		ctx.lineTo(x + strokeHalfLength, y - strokeHalfLength);
		
		ctx.closePath();
		ctx.stroke();		
	}
});