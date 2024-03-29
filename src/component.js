Crafty.c("GamePiece", {
	_gamepiece_require: "Cascader",
	
	init: function() {
		this.requires(this._gamepiece_require);
	},
	
	setGameProperty: function(propertyName, value) {
		if (this[propertyName]) {
			this.detach(this[propertyName]);
		}
		
		var obj = {};
		obj[propertyName] = value;
		this.attr(obj);
		this.attach(value);
		return this;
	}
});

Crafty.c("Snappable", {
	snapX: 1,
	snapY: 1,
	
	_snap_enabled: false,
	
	init: function() {
		this.requires("2D");
	},
	
	enableSnapping: function() {
		if (this._snap_enabled)
			return this;
		this._snap_enabled = true;
		this.bind("Change", this._snap_onChange);
		return this;
	},
	
	disableSnapping: function() {
		if (!this._snap_enabled)
			return this;
		this._snap_enabled = false;
		this.unbind("Change", this._snap_onChange);	
		return this;	
	},
	
	snap: function() {
		this._snap_onChange({x: this.x, y: this.y});
		return this;
	},
	
	_snap_onChange: function(e) {	
		if (e.x || e.snapX) {
			var min = this.snapX * Math.floor(this.x / this.snapX);
			var max = this.snapX * Math.ceil(this.x / this.snapX);
			this.x = Tools.toClosest(this.x, [min, max]).value;
		}
		
		if (e.y || e.snapY) {
			var min = this.snapY * Math.floor(this.y / this.snapY);
			var max = this.snapY * Math.ceil(this.y / this.snapY);
			this.y = Tools.toClosest(this.y, [min, max]).value;			
		}
	}
});

Crafty.c('Cascader', {
	cascadePropertySet: function(attrObj) {
		this.attr(attrObj);
		if (this._children) {
			for (var i = 0; i < this._children.length; ++i) {
				if (this._children[i].cascadePropertySet)
					this._children[i].cascadePropertySet(attrObj);
				else
					this._children[i].attr(attrObj);
			}
		}
	},
	
	cascadeMap: function(fun, data) {
		fun.call(this, data);
		if (this._children) {
			for (var i = 0; i < this._children.length; ++i) {
				if (this._children[i].cascadeMap)
					this._children[i].cascadeMap(fun, data);
				else
					fun.call(this._children[i], data);
			}
		}
	}
});

Crafty.c('Vehicle', {
	epsilon: 1,
	
	seeker: null,
	target: null,
	
	velocity: null,
		
	maxForce: 2.3,
	slowdownRadius: 100,
	maxSpeed: 15.0,
	
	isSeeking: false,
	
	_targetPosition: null,
	
	init: function() {
		this.bind("Remove", this._vehicle_onRemove);
		this._targetPosition = new Crafty.math.Vector2D();
		this.velocity = new Crafty.math.Vector2D(0,0);
	},
	
	_vehicle_onRemove: function() {
		if (this.isSeeking) {
			this.unbind("EnterFrame", this.seek);
			this.isSeeking = false;
		}
		
		delete seeker;
		delete target;
		delete velocity;
		delete _targetPosition;
	},
	
	setSeek: function(target, seeker) {
		this.seeker = (seeker === undefined) ? this : seeker;
		this.target = target;
		
		if (!this.isSeeking) {
			this.bind("EnterFrame", this.seek);
			this.isSeeking = true;
		}
	},
	
	// Courtesy of http://natureofcode.com/book/chapter-6-autonomous-agents/
	seek: function() {
		this._targetPosition.x = this.target.x;
		this._targetPosition.y = this.target.y;
		
		var dir = this._targetPosition.subtract(this.seeker);
		var dist = dir.magnitude();
		
		if (dist < this.epsilon) {
			this.seeker.x = this.target.x;
			this.seeker.y = this.target.y;
			this.velocity.x = 0;
			this.velocity.y = 0;
			
			this.unbind("EnterFrame", this.seek);
			this.trigger("SeekDone", this.seeker);
			this.isSeeking = false;
			return;
		}
			
		if (dist < this.slowdownRadius)
			dir.scaleToMagnitude(dist/this.slowdownRadius * this.maxSpeed);
		else
			dir.scaleToMagnitude(this.maxSpeed);
		
		var force = dir.subtract(this.velocity);
		if (force.magnitude() > this.maxForce)
			force.scaleToMagnitude(this.maxForce);
		
		this.velocity.add(force);
		if (this.velocity.magnitude() > this.maxSpeed)
			this.velocity.scaleToMagnitude(this.maxSpeed);
		
		var x = this.seeker.x;
		var y = this.seeker.y;
		this.seeker.x += this.velocity.x;
		this.seeker.y += this.velocity.y;
		
		// Unfortunately, Crafty rounds out the (x,y) coordinates of our viewport.
		// We accomodate for this by manually jittering the x/y axes towards our target.
		if (Math.round(this.seeker.x) == x && Math.round(this.seeker.y) == y) {
			if (this.velocity.x > 0)
				this.seeker.x += this.velocity.x / Math.abs(this.velocity.x);
			if (this.velocity.y > 0)
				this.seeker.y += this.velocity.y / Math.abs(this.velocity.y);
		}
	},
});


Crafty.c('CustomDraw', {
	_customDraw_require: "2D, Canvas",
	
	drawFunctions: null,
	isDrawingEnabled: false,
	ready: true,
	
	init: function() {
		this.requires(this._customDraw_require).bind("Remove", this._customDraw_onRemove);
		this.drawFunctions = [];
	},
	
	_customDraw_onRemove: function() {
		this.drawFunctions.length = 0;
		delete this.drawFunctions;
	},
	
	disableDrawing: function() {
		if (!this.isDrawingEnabled)
			return this;
			
		this.isDrawingEnabled = false;
		for (var i = 0; i < this.drawFunctions.length; ++i) {
			this.unbind('Draw', this.drawFunctions[i]);
		}
		
		if (this._children) {
			for (var i = 0; i < this._children.length; ++i) {
				if (this._children[i].disableDrawing)
					this._children[i].disableDrawing();
			}
		}
		return this;
	},
	
	enableDrawing: function() {
		if (this.isDrawingEnabled)
			return this;
			
		this.isDrawingEnabled = true;
		for (var i = 0; i < this.drawFunctions.length; ++i) {
			this.bind('Draw', this.drawFunctions[i]);
		}
		
		if (this._children) {
			for (var i = 0; i < this._children.length; ++i) {
				if (this._children[i].enableDrawing)
					this._children[i].enableDrawing();
			}
		}
		return this;		
	}
});

// Simple state machine.  Woooooo.
Crafty.c('StateMachine', {
	DISABLED_STATE: null,
	lastState: null,
	currentState: null,
	
	onRegister: null,
	onUnregister: null,
	
	isMachineEnabled: false,
	
	isMachineStarted: false,
	startState: null,
	startData: null,
	
	init: function() {
		this.bind("Remove", this._stateMachine_onRemove);
		this.onRegister = {};
		this.onUnregister = {};
	},
	
	_stateMachine_onRemove: function() {
		delete this.onRegister;
		delete this.onUnregister;
		delete this.startData;
	},
	
	transitionTo: function(state, data) {
		if (!this.isMachineEnabled)
			return this;
			
		if (this.onUnregister[this.currentState]) {
			this.onUnregister[this.currentState].call(this, state, data);
		}
		
		this.lastState = this.currentState;
		this.currentState = state;
		
		if (this.onRegister[state]) {
			this.onRegister[state].call(this, this.lastState, data);
		}
		
		return this;
	},
	
	enableMachine: function(state, data) {
		if (this.isMachineEnabled)
			return this;
		this.isMachineEnabled = true;
		
		if (state !== undefined)
			this.startState = state;
		if (data !== undefined)
			this.startData = data;
		
		if (this.isMachineStarted)
			this.transitionTo(this.lastState, data);
		else {
			this.isMachineStarted = true;
			this.transitionTo(this.startState, this.startData);
		}
		
		return this;
	},
	
	disableMachine: function(data) {
		if (!this.isMachineEnabled)
			return this;
		this.transitionTo(null, data);
		this.isMachineEnabled = false;
		return this;
	}
});

Crafty.c('Center', {
	init: function() {
		this.requires('2D');
	},

	centerOnX: function(x) {
		return this.attr({
			x: x - this.w/2
		});
	},
	
	centerOnY: function(y) {
		return this.attr({
			y: y - this.h/2
		});
	},
	
	centerOn: function(x, y) {
		return this.attr({
			x: x - this.w/2,
			y: y - this.h/2
		});
	},
	
	centerX: function() {
		return this.x + this.w/2;
	},
	
	centerY: function() {
		return this.y + this.h/2;
	}
});

Crafty.c("MultiInput", {
	_activeMap: null,
	_cooloffMap: null,
	_keys: null,
	__allowedKeyMap: null,
	_movement: null,
	_previousMovement: null,
	_multi_enabled: false,
	
	init: function() {
		this.bind("EnterFrame", this._multi_enterframe).bind("Remove", this._multi_onRemove);
		this._movement = new Crafty.math.Vector2D(0,0);
		this._previousMovement = new Crafty.math.Vector2D(0,0);
		this.multi_clear();
	},
	
	_multi_onRemove: function() {
		delete this._activeMap;
		delete this._cooloffMap;
		delete this._allowedKeyMap;
		delete this._keys;
		delete this._movement;
		delete this._previousMovement;
	},
	
	multi_undoMove: function () {
		this.x -= this._movement.x;
		this.y -= this._movement.y;
		
		if (this._movement.x != 0 || this._movement.y != 0)
			this.trigger('Moved', { x: -this._movement.x, y: -this._movement.y });
	},
	
	multi_clearCooloff: function () {
		this._cooloffMap = {};
	},

	multi_clear: function() {
		this._activeMap = {};
		this._cooloffMap = {};
		this._allowedKeyMap = {};
		this._keys = [];
	},
	
	multi_stop: function() {
		this._activeMap = {};
		this._cooloffMap = {};
	},
	
	multi_add: function (keys, angle, speed, speedReleaseFunc, otherKeyPressFunc) {
		var isNum = !isNaN(speed);
		var speedNum = isNum ? speed : 0;
		var speedFunc = isNum ? null : speed;

		var keyCodes = [];
		for (var i = 0; i < keys.length; ++i) {
			keyCodes.push(Crafty.keys[keys[i]]);
			this._allowedKeyMap[keyCodes[i]] = true;
		}
		
		this._keys.push({
			keys: keyCodes,
			speedNum: speedNum,
			speedFunc: speedFunc,
			speedReleaseFunc: speedReleaseFunc,
			otherKeyPressFunc: otherKeyPressFunc,
			x: Math.round(Math.cos(angle * (Math.PI / 180)) * 1000) / 1000,
			y: Math.round(Math.sin(angle * (Math.PI / 180)) * 1000) / 1000,
			savedData: {},
			lastSpeed: 0,
			startTime: 0,
		});
			
		for (var i = 0; i < keyCodes.length; ++i) {
			if (Crafty.keydown[keyCodes[i]]) {
				this._multi_keydown({ key: keyCodes[i] });
			}
		}
		
		return this;
	},

  	multi_enableControl: function() {
  		if (this._multi_enabled)
  			return this;
  			
		this.bind("KeyDown", this._multi_keydown)
		.bind("KeyUp", this._multi_keyup);
		this._multi_enabled = true;
		return this;
  	},

  	multi_disableControl: function() {
  		if (!this._multi_enabled)
  			return this;
  			
		this.unbind("KeyDown", this._multi_keydown)
		.unbind("KeyUp", this._multi_keyup)
		this._multi_enabled = false;
		return this;
  	},
  	
 	_multi_keydown: function (e) {
 		if (!this._allowedKeyMap[e.key])
 			return;
 			
		for (var i = 0; i < this._keys.length; ++i) {
			var keyInfo = this._keys[i];
			if (keyInfo.keys.indexOf(e.key) >= 0) {
				delete this._cooloffMap[i];
			
				// We want to process this input's speed function
				// so add it to our active map.
				this._activeMap[i] = keyInfo;
				keyInfo.startTime = (new Date()).getTime();
				this.trigger('NewDirection', {
					x: keyInfo.x,
					y: keyInfo.y
				});	
			} else if (keyInfo.otherKeyPressFunc) {
				console.log(e.key);
				keyInfo.otherKeyPressFunc(e.key, keyInfo.savedData);
			}
		}
	},

	_multi_keyup: function (e) {
 		if (!this._allowedKeyMap[e.key])
 			return;
 			
		for (var i = 0; i < this._keys.length; ++i) {
			var keyInfo = this._keys[i];
			if (keyInfo.keys.indexOf(e.key) >= 0) {
				delete this._activeMap[i];
			
				if (keyInfo.speedReleaseFunc) {
					keyInfo.startTime = (new Date()).getTime();
					this._cooloffMap[i] = keyInfo;
				}
				
				this.trigger('NewDirection', {
					x: -keyInfo.x,
					y: -keyInfo.y
				});	
			}
		}
	},
	
	_multi_processActive: function () {
		var keyInfo = null;
		var tempVector
		for (var key in this._activeMap) {		
			keyInfo = this._activeMap[key];
			keyInfo.lastSpeed = keyInfo.speedFunc == null ? 
				keyInfo.speedNum : 
				keyInfo.speedFunc(
					(new Date()).getTime() - keyInfo.startTime,
					keyInfo.lastSpeed,
					this._previousMovement.dotProduct(keyInfo),
					keyInfo.savedData);	
			this._movement.x += keyInfo.lastSpeed * keyInfo.x;
			this._movement.y += keyInfo.lastSpeed * keyInfo.y;
		}
	},
	
	_multi_processCooloff: function() {
		var keyInfo = null;
		var remove = [];
		for (var key in this._cooloffMap) {
			keyInfo = this._cooloffMap[key];
			keyInfo.lastSpeed = keyInfo.speedReleaseFunc(
				(new Date()).getTime() - keyInfo.startTime, 
				keyInfo.lastSpeed,
				this._previousMovement.dotProduct(keyInfo),
				keyInfo.savedData);
			if (isNaN(keyInfo.lastSpeed)) {
				remove.push(key);
			} else {			
				this._movement.x += keyInfo.lastSpeed * keyInfo.x;
				this._movement.y += keyInfo.lastSpeed * keyInfo.y;
			}
		}	
		
		for (key in remove) {
			delete this._cooloffMap[remove[key]];
		}
	},

  	_multi_enterframe: function () {
		if (!this._multi_enabled) return;

		// Apply our speed function to figure out movement per frame.
		this._previousMovement.x = this._movement.x;
		this._previousMovement.y = this._movement.y;
		this._movement.x = 0;
		this._movement.y = 0;
		
		this._multi_processActive();
		this._multi_processCooloff();
		
		var doTrigger = false;
		if (this._movement.x !== 0) {
			this.x += this._movement.x;
			doTrigger = true;
		}
		if (this._movement.y !== 0) {
			this.y += this._movement.y;
			doTrigger = true;
		}
		
		if (doTrigger)
			this.trigger('Moved', { x: this._movement.x, y: this._movement.y });	
	}
});

Crafty.c('Slider', {
	_slider_require: "2D, MultiInput",
	
	x1: 0,
	y1: 0,
	keys1: null,
	x2: 0,
	y2: 0,
	keys2: null,
	
	_slider_offsetX: 0,
	_slider_offsetY: 0,
	_slider_x: 0,
	_slider_y: 0,

	speedOnPress: null,
	speedOnRelease: null,
	speedOnOtherKey: null,
	
	_rightVector: new Crafty.math.Vector2D(1,0),
	_tempVector: new Crafty.math.Vector2D(),
	_slider_percent: 0,
	_slider_offsetX: 0,
	_slider_offsetY: 0,
	
	init: function() {
		this.bind("Remove", this._slider_onRemove).requires(this._slider_require);
		this.multi_enableControl();
		
		this.keys1 = [];
		this.keys2 = [];
		this.bind("Moved", this._slider_moved);
	},
	
	_slider_onRemove: function() {
		this.keys1.length = 0;
		this.keys2.length = 0;
	 	delete this.keys1;
	 	delete this.keys2;
	 	delete this.speedOnPress;
	 	delete this.speedOnRelease;
	 	delete this.speedOnOtherKey;
	},
	
	slide_anchor: function(percent) {
		this._slider_percent = percent;
		return this;
	},
	
	slide_setPoint1: function(x,y,keys) {
		this.x1 = x;
		this.y1 = y;
		this.keys1 = keys;
		return this;
	},
	
	slide_setPoint2: function(x,y,keys) {
		this.x2 = x;
		this.y2 = y;
		this.keys2 = keys;
		return this;
	},
	
	slide_setSpeedFunctions: function(speedOnPress, speedOnRelease, onOtherKey) {
		this.speedOnPress = speedOnPress;
		this.speedOnRelease = speedOnRelease;
		this.speedOnOtherKey = onOtherKey;
		return this;
	},
	
	slide_applySettings: function() {
		// First find the point that is percent% between the two points.
		this._slider_x = this.x;
		this._slider_y = this.y;
		
		this._slider_offsetX = this._slider_percent*(this.x2-this.x1) + this.x1 - this.x;
		this._slider_offsetY = this._slider_percent*(this.y2-this.y1) + this.y1 - this.y;
		
		this._tempVector.x = this.x2-this.x1;
		this._tempVector.y = this.y2-this.y1;
		
		// Try to handle some common rounding issues
		var angle = 0;
		if (this._tempVector.x == 0)
			angle = this._tempVector.y < 0 ? -90 : 90;
		else if (this._tempVector.y == 0)
			angle = this._tempVector.x < 0 ? 180 : 0;
		else
			angle = Crafty.math.radToDeg(this._rightVector.angleTo(this._tempVector));

		this.multi_clear();
		
		this.multi_add(this.keys2, angle, this.speedOnPress, this.speedOnRelease, this.speedOnOtherKey);
		this.multi_add(this.keys1, 180+angle, this.speedOnPress, this.speedOnRelease, this.speedOnOtherKey);
		return this;
	},
	
	_slider_moved: function(e) {			
		var oldX = this._slider_x, oldY = this._slider_y;
		
		this._slider_x += e.x;
		this._slider_y += e.y;
		
		this._slider_x = Tools.clamp(this.x1 - this._slider_offsetX, this._slider_x, this.x2 - this._slider_offsetX);
		this._slider_y = Tools.clamp(this.y1 - this._slider_offsetY, this._slider_y, this.y2 - this._slider_offsetY);
		
		var deltaX = this._slider_x - oldX, deltaY = this._slider_y - oldY;

		if (!Tools.isNegligableDiff(e.x, deltaX) || !Tools.isNegligableDiff(e.y, deltaY)) {
			this.x = this.x - e.x + deltaX;
			this.y = this.y - e.y + deltaY;
			
			this.multi_clearCooloff();
			var data = {
				x: Tools.toClosest(this._slider_x + this._slider_offsetX, [this.x1, this.x2]).value,
				y: Tools.toClosest(this._slider_y + this._slider_offsetY, [this.y1, this.y2]).value
			};
			
			data.otherX = Tools.toFarthest(data.x, [this.x1, this.x2]).value;
			data.otherY = Tools.toFarthest(data.y, [this.y1, this.y2]).value;
			
			this.trigger(R.Event.sliderHit, data);
		}
	}
});


Crafty.c('GraphDraw', {
	_graphdraw_require: "CustomDraw, 2D, Center",
	
	strokeStyle: "#000000",
	lineWidth: 1,
	alpha: 1,
	graphdraw_vertexBaseX: 0,
	graphdraw_vertexBaseY: 0,
	
	_graphdraw_adjacencyList: null,
	_graphdraw_maxX: -Number.MAX_VALUE,
	_graphdraw_maxY: -Number.MAX_VALUE,
	
	init: function() {
		this.bind("Remove", this._graphdraw_onRemove).requires(this._graphdraw_require)
		.attr({
			x: 0,
			y: 0,
			w: 1,
			h: 1,
		})
		.bind('Change',this._graphdraw_change);
		this._graphdraw_adjacencyList = [];		
		this.drawFunctions.push(this._graphdraw_draw);
	},
	
	_graphdraw_onRemove: function() {
		this._graphdraw_adjacencyList.length = 0;
		delete this._graphdraw_adjacencyList;
	},
	
	graphdraw_clear: function() {
		for (var i = 0; i < this._graphdraw_adjacencyList.length; ++i)
			this._graphdraw_adjacencyList[i].length = 0;
		this._graphdraw_adjacencyList.length = 0;
	},
	
	graphdraw_tryAddEdge: function(v1, v2) {
		var orderedV = [v1.clone(), v2.clone()].sort(Tools.sort2DVFunction);
		var edgeset;
		
		for (var i = 0; i < this._graphdraw_adjacencyList.length; ++i) {
			edgeset = this._graphdraw_adjacencyList[i];
			if (Tools.are2DVEqual(orderedV[0], edgeset[0])) {
					
				for (var j = 1; j < edgeset.length; ++j) {
					// If we found our second vertex, just return.  Nothing to add.
					if (Tools.are2DVEqual(orderedV[1], edgeset[j]))
						return false;
				}
				
				// We didn't find our second vertex.  Time to add it!
				edgeset.push(orderedV[1]);
				this._graphdraw_updateDimensions(orderedV[0], orderedV[1]);				
				return true;
			}	
		}
		
		// Oh well, we didn't find our edge.  Add it.
		this._graphdraw_adjacencyList.push(orderedV)
		this._graphdraw_updateDimensions(orderedV[0], orderedV[1]);
		return true;
	},
	
	graphdraw_offsetX: function() {
		return this.graphdraw_vertexBaseX - this.lineWidth/2;
	},
	
	graphdraw_offsetY: function() {
		return this.graphdraw_vertexBaseY - this.lineWidth/2;
	},
	
	graphdraw_vertexBase: function() {
		var absPos = {
			_x: this.x,
			_y: this.y
		};
		
		absPos._x -= this.graphdraw_offsetX();
		absPos._y -= this.graphdraw_offsetY();
		
		return absPos;
	},
	
	_graphdraw_updateDimensions: function(v1, v2) {
		this._graphdraw_maxX = Math.max(this._graphdraw_maxX, Math.max(v1.x, v2.x));
		this._graphdraw_maxY = Math.max(this._graphdraw_maxY, Math.max(v1.y, v2.y));
		this.w = this._graphdraw_maxX - this.graphdraw_vertexBaseX + this.lineWidth;
		this.h = this._graphdraw_maxY - this.graphdraw_vertexBaseY + this.lineWidth;
	},
	
	_graphdraw_change: function(data) {
		if (typeof data.lineWidth !== 'undefined') {
			this.w = this._graphdraw_maxX - this.graphdraw_vertexBaseX + this.lineWidth;
			this.h = this._graphdraw_maxY - this.graphdraw_vertexBaseY + this.lineWidth;
		}
	},
	
	_graphdraw_draw: function(data) {
		// We don't support drawing to the DOM, sadly
		if (data.type == 'DOM')
			return;

		// For now, naively draw all of our strokes
		var strokes = this._graphdraw_adjacencyList;
		var ctx = data.ctx;
		var pos = data.pos;
	    	
		/*ctx.save();
		ctx.globalAlpha = 0.5;
		ctx.fillStyle = "#FF0000";
		ctx.fillRect(data.pos._x, data.pos._y, data.pos._w, data.pos._h);
		ctx.restore();*/
		
	    ctx.save();
	    ctx.globalAlpha = this.alpha;
		ctx.strokeStyle = this.strokeStyle;
		ctx.fillStyle = this.strokeStyle;
		ctx.lineWidth = this.lineWidth;
		ctx.beginPath();
		
		// Render the smallest point at (x,y)
		var transX = pos._x - this.graphdraw_offsetX();
		var transY = pos._y - this.graphdraw_offsetY();
		ctx.translate(transX, transY);
		for (var i = 0; i < strokes.length; ++i) {
			for (var j = 0; j < strokes[i].length; ++j) {
				ctx.moveTo(strokes[i][0].x, strokes[i][0].y);
				ctx.lineTo(strokes[i][j].x, strokes[i][j].y);
	   		}
	   	}
	   	
	    ctx.closePath();
	    ctx.stroke();
	    
	    for (var i = 0; i < strokes.length; ++i) {
	    	for (var j = 0; j < strokes[i].length; ++j) {
		    	ctx.beginPath();
		    	ctx.arc(strokes[i][j].x, strokes[i][j].y, this.lineWidth/2, 0, 2*Math.PI, false);
		    	ctx.closePath();
		    	ctx.fill();
	    	}
	    }
	    
	    ctx.translate(-transX, -transY);
	    ctx.restore();
	}
});


Crafty.c('Graph', {
	graph_numEdges: 0,
	
	_graph_adjacencyList: null,
	_graph_labels: null,
	
	init: function() {
		this.bind("Remove", this._graph_onRemove);
		this._graph_adjacencyList = [];
		this._graph_labels = {};
	},
	
	_graph_onRemove: function() {
		delete this._graph_adjacencyList;
		delete this._graph_labels;
	},

	graph_makeUndirected: function() {
		for (var i = 0; i < this._graph_adjacencyList.length; ++i) {
			var vertex = this._graph_adjacencyList[i].startVertex;
			var neighborSet = this.graph_neighborSet(vertex);
			if (neighborSet != null) {
				for (var j = 0; j < neighborSet.length; ++j) {
					this.graph_safeAddEdge(neighborSet[j], vertex);
				}
			}
		}
		return this;
	},
	
	graph_unsafeAddEdge: function(v1, v2) {
		var edges = this.graph_edgeSet(v1);
		
		if (edges == null)
			this._graph_addNewEdgeSet(v1, v2);
		else
			edges.endVertices.push(v2);
		
		++this.graph_numEdges;
		return this;
	},
	
	graph_safeAddEdge: function(v1, v2) {
		var edges = this.graph_edgeSet(v1);
		if (edges == null) {
			// We don't have any edgesets for v1, so create it.
			this._graph_addNewEdgeSet(v1, v2);
		} else {			
			// Check if we're adding the same edge twice
			for (var i = 0; i < edges.endVertices.length; ++i) {
				if (edges.endVertices[i].x == v2.x && edges.endVertices[i].y == v2.y) {
					// We've already added this edge, so immediately quit
					return this;
				}
			}
				
			// We didn't find the edge, so add it and return
			edges.endVertices.push(v2);
		}	
		
		++this.graph_numEdges;
		return this;
	},
	
	graph_addLabel: function(label, v) {
		this._graph_labels[label] = v;
	},
	
	graph_neighborSet: function(v) {
		var edgeSet = this.graph_edgeSet(v);
		return (edgeSet == null) ? null : edgeSet.endVertices;
	},
	
	graph_edgeSet: function(v) {
		for (var i = 0; i < this._graph_adjacencyList.length; ++i) {
			var edges = this._graph_adjacencyList[i];
			if (edges.startVertex.x == v.x && edges.startVertex.y == v.y)
				return edges;
		}
		return null;
	},
	
	graph_labelSet: function(label) {
		return this._graph_labels[label];
	},
	
	_graph_addNewEdgeSet: function(v1, v2) {
		var edges = {
			startVertex: v1,
			endVertices: (v2 == undefined ? [] : [v2])
		};
		this._graph_adjacencyList.push(edges);
		return edges;
	},
});


Crafty.c('Ellipse', {
	_ellipse_require: "CustomDraw, Center",
	
  init: function() {
    this.requires(this._ellipse_require)
    .attr({
      	x: 50,
      	y: 50,
      	w: 10,
      	h: 10,
      	lineWidth: 5,
      	strokeStyle: "#FFFFFF",
      	onClose: 'stroke',
      	alpha: 1
    });
    this.drawFunctions.push(this._ellipse_draw);
  },
  
  _ellipse_draw: function(data) {
  	// We currently don't support drawing to the DOM directly
  	if (data.type == 'DOM')
  		return;
  		
  	var ctx = data.ctx;
  	var pos = data.pos;
  	var x = pos._x;
  	var y = pos._y;
  	var w = pos._w;
  	var h = pos._h;		

	// The arc function draws around a central point.  We need to translate our (x,y), the top-left of our
	// render rectangle, to the center, then calculate the real width/height of our sphere.
	// Mutate our local variables.  If we modify the values in our data packet, we'll mess up other
	// draw functions.
	x += w/2;
	y += h/2;
	h = (h - this.lineWidth) / 2;
	w = (w - this.lineWidth) / 2;
	
  	// Save the context, set up our arc, restore our path transformation, then stroke
  	// to prevent the stroke from being distorted by scaling
  	ctx.save();
  	
  	ctx.globalAlpha = this.alpha;			
  	ctx.strokeStyle = this.strokeStyle;
  	ctx.fillStyle = this.fillStyle;
  	ctx.lineWidth = this.lineWidth;
  	ctx.save();
	ctx.scale(w, h);
	ctx.beginPath();
	ctx.arc(x / w, y / h, 1, 0, Math.PI*2, false);
	ctx.restore();
	
	// Stroke or fill
	ctx.closePath();
	ctx[this.onClose]();
		
	ctx.restore();
  }
});