Crafty.c("Mutex", {
	v1: new Crafty.math.Vector2D(),
	v2: new Crafty.math.Vector2D(),
		
	init: function() {
		this.bind("Remove", this._mutex_onRemove).requires("2D, CustomDraw")
		.bind(R.Event.playerMovement, this._mutex_onPlayerMovement)
		.bind(R.Event.sliderHit, this._mutex_onSliderHit)
		.attr({
			x: 0,
			y: 0,
			lockedGroup: [],
			unlockedGroup: [],
			baseColor: "#222222",
			symbolColor: "#FFFF00",
			lineWidth: 5,		
			mutexRadius: 40,
			_mutex_maxX: -Number.MAX_VALUE,
			_mutex_maxY: -Number.MAX_VALUE,
		});	
		this.drawFunctions.push(this._mutex_draw);
	},
	
	mutex_addLock: function(lock) {
		this.lockedGroup.push(lock);
		this._mutex_updateDimensions(lock);
	},
	
	mutex_addKey: function(key) {
		this.unlockedGroup.push(key);
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
		this.unlockedGroup.length = 0;
		this.lockedGroup.length = 0;
		delete this.unlockedGroup;
		delete this.lockedGroup;
		delete this.v1;
		delete this.v2;
	},
	
	_mutex_onPlayerMovement: function(player) {
		var base = this._parent.graphdraw_vertexBase();
		
		var v1 = this.v1;
		var v2 = this.v2;
		
		v1.x = player.centerX();
		v1.y = player.centerY();
		
		// Check the locked group first
		var diffSquared = Math.pow(this.mutexRadius + player.w/2, 2);
		for (var i = 0; i < this.lockedGroup.length; ++i) {
			v2.x = base._x + this.lockedGroup[i].x;
			v2.y = base._y + this.lockedGroup[i].y;

			if (v2.subtract(v1).magnitudeSq() < diffSquared) {
				player.inMutexLockZone = this;
				player.inMutexUnlockZone = null;
				return;
			}
		}
		
		player.hasMutexPass = false;
		if (player.inMutexLockZone == this)
			player.inMutexLockZone = null;
		
		for (var i = 0; i < this.unlockedGroup.length; ++i) {
			v2.x = base._x + this.unlockedGroup[i].x;
			v2.y = base._y + this.unlockedGroup[i].y;
			
			if (v2.subtract(v1).magnitudeSq() < diffSquared) {
				player.inMutexUnlockZone = this;
				return;
			}
		}
		
		if (player.inMutexUnlockZone == this)
			player.inMutexUnlockZone = null;
	},
	
	_mutex_onSliderHit: function(player) {
		if (player.inMutexLockZone == this) {
			// this is unfortunate.  Only allow the player to backpeddle away from the
			// mutex center.
			player.hasMutexPass = false;
			player.multi_undoMove();
			player.transitionTo(R.States.move)
		}
		
		if (player.inMutexUnlockZone == this) {
			// Oh cool, now we get to swap stuff.  Awesome.
			// If the player was 
			var temp = this.unlockedGroup;
			this.unlockedGroup = this.lockedGroup;
			this.lockedGroup = temp;
			
			// The player locks its zone, but we give it a free pass to move
			// about in the unlocked zone.
			player.hasMutexPass = true;
		}
	},
	
	_mutex_draw: function(data) {
		var ctx = data.ctx;
		var transX = data.pos._x - this._parent.graphdraw_vertexBaseX + this.mutexRadius + this.lineWidth/2;
		var transY = data.pos._y - this._parent.graphdraw_vertexBaseY + this.mutexRadius + this.lineWidth/2;
				
		ctx.save();
		ctx.lineWidth = this.lineWidth;
		ctx.strokeStyle = this.symbolColor;
		ctx.fillStyle = this.baseColor;
		ctx.translate(transX, transY);
		
		// If we're locked, then lockedGroup are Xs, unlockedGroup are Os	
		for (var i = 0; i < this.lockedGroup.length; ++i) {
			var l = this.lockedGroup[i];
			this._mutex_drawO(ctx, l.x, l.y, this.mutexRadius, "fill");
			this._mutex_drawX(ctx, l.x, l.y, this.mutexRadius * .55);
		}
		
		for (var i = 0; i < this.unlockedGroup.length; ++i) {
			var k = this.unlockedGroup[i];
			this._mutex_drawO(ctx, k.x, k.y, this.mutexRadius, "fill");
			this._mutex_drawO(ctx, k.x, k.y, this.mutexRadius * .55, "stroke");
		}

		ctx.translate(-transX, -transY);
		ctx.restore();
	},
	
	_mutex_drawO: function(ctx, x, y, r, drawFunc) {
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