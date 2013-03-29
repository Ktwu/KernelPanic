Crafty.c('KernelPanic', {
	init: function() {
		// bind for game-specific functions
		this.bind(R.Event.sliderHit, this._kernelPanic_sliderHit)
		.bind('EnterFrame', this._kernelPanic_enterFrame);
	},
	
	// When the play hits a node, we determine whether they've hit an in-game object
	// or if they need to choose a new path to travel on.
	_kernelPanic_sliderHit: function(data) {
		// The vertices we can go to.
		D.vector.x = data.x;
		D.vector.y = data.y;	
		var edgeSet = Game.player.graph.edgeSet(D.vector);
		var vertices = edgeSet.endVertices;
		
		if (!vertices) {
			Game.player.player_putOnLine(data.x, data.y, data.otherX, data.otherY);
		} else {
			Game.player.multi_disableControl();
			Game.hud.visible = true;
			Game.hud.gameHud_clear();	
			
			Game.hud.gameHud_load(edgeSet);
			this.bind('KeyDown', this._kernelPanic_waitForHudChoice);
		} 
	},
	
	_kernelPanic_waitForHudChoice: function(e) {
		var key = R.CodeToKey[e.key];
		if (Game.hud.gameHud_keyMap[key]) {
			var end = Game.hud.gameHud_keyMap[key].vertex;
			var start = Game.hud.gameHud_startVertex;
				
			Game.player.player_putOnLine(start.x, start.y, end.x, end.y);
			Game.player.multi_enableControl();
			Game.hud.visible = false;
			this.unbind('KeyDown', this._kernelPanic_waitForHudChoice);
		}
	},
	
	_kernelPanic_enterFrame: function() {
		Game.graph.y -= .5;
	}
});

Crafty.c('CustomDraw', {
	ready: true,
	init: function() {
		this.requires('2D, Canvas');
	}
});

Crafty.c('Center', {
	init: function() {
		this.requires('2D');
	},

	centerOnX: function(x) {
		this.x = x - this.w/2;
		return this;
	},
	
	centerOnY: function(y) {
		this.y = y - this.y/2;
		return this;
	},
	
	centerOn: function(x, y) {
  		this.x = x - this.w/2,
  		this.y = y - this.h/2
  		return this;	
	},
	
	centerX: function() {
		return this.x + this.w/2;
	},
	
	centerY: function() {
		return this.y + this.h/2;
	}
});

Crafty.c('BeforeDraw', {
	beforeDrawFunctions: null,
	
	init: function() {
		this.requires('CustomDraw')
		.bind('Draw', this._before_draw);
		this.beforeDrawFunctions = [];
	},
	
	_before_draw: function(data) {
		for (var i = 0; i < this.beforeDrawFunctions.length; ++i)
			this.beforeDrawFunctions[i](data);
	}
});

Crafty.c('AfterDraw', {
	afterDrawFunctions: null,
	
	init: function() {
		this.requires('CustomDraw')
		.bind('Draw', this._after_draw);
		this.afterDrawFunctions = [];
	},
	
	_after_draw: function(data) {
		for (var i = 0; i < this.afterDrawFunctions.length; ++i)
			this.afterDrawFunctions[i](data);
	}
});

Crafty.c("MultiInput", {
	_activeMap: null,
	_cooloffMap: null,
	_keys: null,
	_movement: null,
	_multi_enabled: false,
	
	init: function() {
		this._movement = {
			x: 0,
			y: 0
		};
		this.multi_clear();
		this.bind("EnterFrame", this._multi_enterframe);
	},

	_multi_keydown: function (e) {
		var keyInfo = this._keys[e.key];
		if (this._keys[e.key]) {
			delete this._cooloffMap[e.key];
			
			// We want to process this input's speed function
			// so add it to our active map.
			this._activeMap[e.key] = keyInfo;
			keyInfo.startTime = (new Date()).getTime();
			this.trigger('NewDirection', {
				x: keyInfo.x,
				y: keyInfo.y
			});
		}
	},

	_multi_keyup: function (e) {
		var keyInfo = this._keys[e.key];
		if (this._keys[e.key]) {
			delete this._activeMap[e.key];
			
			// When the key is released, we might want some lingering movement.
			// Process this lingering movement after the key is released.
			if (keyInfo.speedReleaseFunc) {
				keyInfo.startTime = (new Date()).getTime();
				keyInfo.speedOnRelease = keyInfo.lastSpeed;
				this._cooloffMap[e.key] = keyInfo;
			}
			
			this.trigger('NewDirection', {
				x: -keyInfo.x,
				y: -keyInfo.y
			});
		}
	},
	
	_multi_processActive: function () {
		var keyInfo = null;
		for (var key in this._activeMap) {
			keyInfo = this._activeMap[key];
			keyInfo.lastSpeed = keyInfo.speedFunc == null ? 
				keyInfo.speedNum : 
				keyInfo.speedFunc((new Date()).getTime() - keyInfo.startTime, keyInfo.lastSpeed);
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
				keyInfo.speedOnRelease, 
				keyInfo.lastSpeed);
			
			if (isNaN(keyInfo.lastSpeed)) {
				remove.push(key);
			} else {			
				this._movement.x += keyInfo.lastSpeed * keyInfo.x;
				this._movement.y += keyInfo.lastSpeed * keyInfo.y;
			}
		}	
		
		for (key in remove) {
			delete this._cooloffMap[key];
		}
	},

  	_multi_enterframe: function () {
		if (!this._multi_enabled) return;

		// Apply our speed function to figure out movement per frame.
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
	},
	
	multi_undoMove: function () {
		this.x -= this._movement.x;
		this.y -= this._movement.y;
	},
	
	multi_clearCooloff: function () {
		this._cooloffMap = {};
	},

	multi_clear: function() {
		this._activeMap = {};
		this._cooloffMap = {};
		this._keys = {};
	},
	
	multi_add: function (keys, speed, speedReleaseFunc) {
		var isNum = !isNaN(speed);
		var speedNum = isNum ? speed : 0;
		var speedFunc = isNum ? null : speed;
		
		for (var k in keys) {
			var keyCode = Crafty.keys[k];
			this._keys[keyCode] = {
				speedNum: speedNum,
				speedFunc: speedFunc,
				speedReleaseFunc: speedReleaseFunc,
				x: Math.round(Math.cos(keys[k] * (Math.PI / 180)) * 1000) / 1000,
				y: Math.round(Math.sin(keys[k] * (Math.PI / 180)) * 1000) / 1000,
				lastSpeed: 0,
				speedOnRelease: 0,
				startTime: 0
			};
			
			if (Crafty.keydown[keyCode]) {
				this.trigger("KeyDown", { key: keyCode });
			}
		}

		this.multi_enableControl();

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
});

Crafty.c('Slider', {
	x1: 0,
	y1: 0,
	keys1: null,
	x2: 0,
	y2: 0,
	_slider_offsetX: 0,
	_slider_offsetY: 0,
	_slider_x: 0,
	_slider_y: 0,
	keys2: null,
	speedOnPress: null,
	speedOnRelease: null,
	
	_rightVector: new Crafty.math.Vector2D(1,0),
	_tempVector: new Crafty.math.Vector2D(),
	_slider_percent: 0,
	_slider_offsetX: 0,
	_slider_offsetY: 0,
	
	init: function() {
		this.requires('2D, MultiInput');
		this.multi_enableControl();
		
		this.keys1 = [];
		this.keys2 = [];
		this.bind("Moved", this._slider_moved);
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
	
	slide_setSpeedFunctions: function(speedOnPress, speedOnRelease) {
		this.speedOnPress = speedOnPress;
		this.speedOnRelease = speedOnRelease;
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
				
		var props = {};
		var i = 0;
		
		for (i = 0; i < this.keys1.length; ++i)
			props[this.keys1[i]] = 180+angle;	
		for (i = 0; i < this.keys2.length; ++i)
			props[this.keys2[i]] = angle;

		this.multi_clear();
		this.multi_add(props, this.speedOnPress, this.speedOnRelease);
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

Crafty.c('Player', {
	graph: null,
	_tmp_vector: new Crafty.math.Vector2D(),
	
	init: function() {
		this.requires('BeforeDraw, Slider, AfterDraw')
		.bind(R.Event.sliderHit, this._player_sliderHit);
	},
	
	player_putOnLine: function(x1, y1, x2, y2) {	
		this.slide_setPoint1(x1, y1, ['LEFT_ARROW'])
		.slide_setPoint2(x2, y2, ['RIGHT_ARROW']);
		
		var absPos = this.graph.absoluteVertexBasePos();
		x1 += absPos._x;
		y1 += absPos._y;

		this.centerOn(x1,y1)
		.slide_anchor(0)
		.slide_setSpeedFunctions(this._player_speed, this._player_releaseSpeed)
		.slide_applySettings();
	},
	
	_player_speed: function(time, speed) {
		return Math.min(time/100, 10);
	},
	
	_player_releaseSpeed: function(time, releaseSpeed, speed) {
		speed -= 0.5;  return speed < 1 ? NaN : speed;
	},
	
	_player_sliderHit: function(data) {
		// Ferry the data from us to our game logic.
		Game.KernelPanic.trigger(R.Event.sliderHit, data);
	},
});

Crafty.c('GameHud', {
	gameHud_startVertex: null,
	gameHud_keyMap: null,
	gameHud_displacement: 20,
	_gameHud_keyList: ['D', 'C', 'X', 'Z', 'A', 'Q', 'W', 'E'],
	_gameHud_angleList: [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4],
	
	init: function() {
		this.requires('Ellipse')
		.bind('Draw', this._gameHud_draw);
		this.gameHud_keyMap = {};
	},
	
	gameHud_clear: function() {
		this.gameHud_keyMap = {};
	},
	
	gameHud_load: function(edgeset) {
		this.gameHud_startVertex = edgeset.startVertex;
		var ends = edgeset.endVertices;
		var angle;
		var angles = [];
		for (var i = 0; i < ends.length; ++i) {
			D.vector.x = ends[i].x;
			D.vector.y = ends[i].y;
			D.vector = D.vector.subtract(edgeset.startVertex).normalize();
			
			angle = R.Vector.right.angleBetween(D.vector);
			if (angle < 0)
				angle += 2*Math.PI;
			angles.push(angle);
		}
		
		// For each angle, find its closest value.
		// For the closest value, find out if someone is closer to it, and if so, repeat.
		// For each matching, remove the matched values from their lists and repeat.
		// Expensive for lots of things, but not for small things!
		var angleBlacklist = [];
		var keyAngleBlacklist = [];
		var i = 0;
		while (angleBlacklist.length < angles.length
			&& keyAngleBlacklist.length < this._gameHud_keyList.length) {
				
			// Find the closest key-angle to our angle, then verify that there's no other
			// key-angle that's closer
			var keyData = Tools.toClosest(angles[i], this._gameHud_angleList, keyAngleBlacklist);
			var angleData = Tools.toClosest(keyData.value, angles, angleBlacklist);
			
			if (angleData.value == angles[i]) {
				// Excellent, a matching!
				this.gameHud_keyMap[this._gameHud_keyList[keyData.i]] = {
					direction: new Crafty.math.Vector2D(Math.cos(angles[i]), Math.sin(angles[i])),
					vertex: ends[i]
				};
				
				angleBlacklist.push(angleData.value);
				keyAngleBlacklist.push(keyData.value);
			} else {
				// If some other angle is closer to our key, then let's find out
				// who this new key should match to first.
				i = angleData.i;
			}
		}
	},
	
	_gameHud_draw: function(data) {
		var ctx = data.ctx;
		
		ctx.save();
		ctx.fillStyle = "#FF0000";
		ctx.font = "bold 12px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		for (var key in this.gameHud_keyMap) {
			ctx.fillText(key, 
				(this.gameHud_displacement * this.gameHud_keyMap[key].direction.x + this.centerX()),
				(this.gameHud_displacement * this.gameHud_keyMap[key].direction.y + this.centerY()));
		}
		
		ctx.restore();
	}
});

Crafty.c('GameGraph', {
	init: function() {
		this.requires('BeforeDraw, Graph, AfterDraw');
	}
});


Crafty.c('Graph', {
	_adjacencyList: null,
	_drawCache: null,
	_labels: null,
	
	_minX: Number.MAX_VALUE,
	_maxX: Number.MIN_VALUE,
	_minY: Number.MAX_VALUE,
	_maxY: Number.MIN_VALUE,
	
	init: function() {
		this.requires('CustomDraw')
		.bind("Draw", this._graph_draw)
		.attr({
			x: 0,
			y: 0,
			w: 1,
			h: 1
		});
		this._adjacencyList = [];
		this._drawCache = [];
		this._labels = {};
	},
	
	loadGraph: function(graph) {
		this._adjacencyList = [];
		this._drawCache = [];
		this._labels = {};
		
		var list = graph.list;
		for (var i = 0; i < list.length; ++i) {
			var v1 = new Crafty.math.Vector2D(list[i][0][0], list[i][0][1]);
			for (var j = 1; j < list[i].length; ++j) {
				this.unsafeAddEdge(v1, new Crafty.math.Vector2D(list[i][j][0], list[i][j][1]), false)
			}
		}
		
		var labels = graph.labels;
		if (labels) {
			for (var label in labels) {
				this.addLabel(label, labels[label]);
			}
		}
		
		this.strokeStyle = graph.strokeStyle;
		this.lineWidth = graph.lineWidth;
		
		return this;
	},

	makeUndirected: function() {
		for (var i = 0; i < this._adjacencyList.length; ++i) {
			var vertex = this._adjacencyList[i].startVertex;
			var neighborSet = this.neighborSet(vertex);
			if (neighborSet != null) {
				for (var j = 0; j < neighborSet.length; ++j) {
					this.safeAddEdge(neighborSet[j], vertex, true);
				}
			}
		}
		return this;
	},
	
	unsafeAddEdge: function(v1, v2, o_ignoreCache) {
		var edges = this.edgeSet(v1);
		
		if (edges == null) {
			this._graph_addNewEdgeSet(v1, v2);
		} else {
			edges.endVertices.push(v2);
		}
		
		// Determine whether we should add the edge to our drawing cache
		if (!o_ignoreCache) {
			this._graph_tryToAddToDrawCache(v1,v2);
		}
		
		this._graph_updateDimensions(v1, v2);
		return this;
	},
	
	safeAddEdge: function(v1, v2, o_ignoreCache) {
		var edges = this.edgeSet(v1);
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
		
		// Determine whether we should add the edge to our drawing cache
		if (!o_ignoreCache && !this._graph_isInDrawCache(v2,v1)) {
			this._graph_tryToAddToDrawCache(v1,v2);
		}		
		
		this._graph_updateDimensions(v1, v2);
		return this;
	},
	
	addLabel: function(label, v) {
		this._labels[label] = v;
	},
	
	neighborSet: function(v) {
		var edgeSet = this.edgeSet(v);
		return (edgeSet == null) ? null : edgeSet.endVertices;
	},
	
	edgeSet: function(v) {
		for (var i = 0; i < this._adjacencyList.length; ++i) {
			var edges = this._adjacencyList[i];
			if (edges.startVertex.x == v.x && edges.startVertex.y == v.y) {
				return edges;
			}
		}
		return null;
	},
	
	labelSet: function(label) {
		return this._labels[label];
	},
	
	offsetX: function() {
		return this._minX;
	},
	
	offsetY: function() {
		return this._minY;
	},
	
	absoluteVertexBasePos: function() {
		var absPos = this.absolutePos();
		absPos._x -= this._minX;
		absPos._y -= this._minY;
		return absPos;
	},
	
	_graph_updateDimensions: function(v1, v2) {
		this._minX = Math.min(this._minX, Math.min(v1.x, v2.x));
		this._maxX = Math.max(this._maxX, Math.max(v1.x, v2.x));
		this._minY = Math.min(this._minY, Math.min(v1.y, v2.y));
		this._maxY = Math.max(this._maxY, Math.max(v1.y, v2.y));
		this.w = this._maxX - this._minX;
		this.h = this._maxY - this._minY;
	},
	
	_graph_isInDrawCache: function(v1, v2) {
		var d1, d2;
		var inCache = false;
		for (var i = 0; i < this._drawCache && !inCache; ++i) {
			d1 = this._drawCache[i][0];
			if (d1.x == v1.x && d1.y == v1.y) {
				for (var j = 1; j < this._drawCache[i] && !inCache; ++j) {
					d2 = this._drawCache[i][j];
					inCache = d2.x == v2.x && d2.y == v2.y;
				}
			}	
		}
		return inCache;
	},
	
	_graph_tryToAddToDrawCache: function(v1, v2) {
		var d1, d2;
		var inCache = false;
		for (var i = 0; i < this._drawCache && !inCache; ++i) {
			d1 = this._drawCache[i][0];
			if (d1.x == v1.x && d1.y == v1.y) {
				for (var j = 1; j < this._drawCache[i] && !inCache; ++j) {
					d2 = this._drawCache[i][j];
					inCache = d2.x == v2.x && d2.y == v2.y;
				}
				
				if (!inCache) {
					this._drawCache[i].push(v2);
				}
				
				return;
			}	
		}
		
		this._drawCache.push([v1, v2]);
	},
	
	_graph_addNewEdgeSet: function(v1, v2) {
		var edges = {
			startVertex: v1,
			endVertices: (v2 == undefined ? [] : [v2])
		};
		this._adjacencyList.push(edges);
		return edges;
	},
	
	_graph_sort: function(v1, v2) {
		if (v1.x < v2.x)
			return -1
		else if (v1.x == v2.x && v1.y < v2.y)
			return -1;
		else if (v1.x == v2.x && v1.y == v2.y)
			return 0;
		else return 1;
	},
	
	_graph_draw: function(data) {
		// We don't support drawing to the DOM, sadly
		if (data.type == 'DOM')
			return;
		
		// For now, naively draw all of our strokes
		var strokes = this._drawCache;
		var ctx = data.ctx;
		var pos = data.pos;
		
		ctx.strokeStyle = this.strokeStyle;
		ctx.lineWidth = this.lineWidth;
		ctx.beginPath();
		
		// Render the smallest point at (x,y)
		var transX = pos._x - this.offsetX();
		var transY = pos._y - this.offsetY();
		ctx.translate(transX, transY);
		for (var i = 0; i < strokes.length; ++i) {
			for (var j = 0; j < strokes[i].length; ++j) {
				ctx.moveTo(strokes[i][0].x, strokes[i][0].y);
				ctx.lineTo(strokes[i][j].x, strokes[i][j].y);
	   		}
	   	}
	    ctx.translate(-transX, -transY);
	   	
	    ctx.closePath();
	    ctx.stroke();		
	}
});


// This is the player-controlled character
Crafty.c('Ellipse', {
  init: function() {
    this.requires('CustomDraw, Center')
      this.bind("Draw", this._ellipse_draw);
        
      this.attr({
      	x: 50,
      	y: 50,
      	w: 10,
      	h: 10,
      	lineWidth: 5,
      	strokeStyle: "#FFFFFF",
      	onClose: 'stroke'
      });
  },

  _ellipse_draw: function(data) {
  	// We currently don't support drawing to the DOM directly
  	if (data.type == 'DOM')
  		return;
  		
  	var ctx = data.ctx;
  	var pos = data.pos;

	// The arc function draws around a central point.  We need to translate our (x,y), the top-left of our
	// render rectangle, to the center, then calculate the real width/height of our sphere.
	pos._x += pos._w/2;
	pos._y += pos._h/2;
	pos._h = (pos._h - this.lineWidth) / 2;
	pos._w = (pos._w - this.lineWidth) / 2;
	
  	// Save the context, set up our arc, restore our path transformation, then stroke
  	// to prevent the stroke from being distorted by scaling
  	ctx.strokeStyle = this.strokeStyle;
  	ctx.fillStyle = this.fillStyle;
  	ctx.lineWidth = this.lineWidth;
  	ctx.save();
	ctx.scale(pos._w, pos._h);
	ctx.beginPath();
	ctx.arc(pos._x / pos._w, pos._y / pos._h, 1, 0, Math.PI*2, false);
	ctx.restore();
	
	// Stroke or fill
	ctx[this.onClose]();
		
	ctx.closePath();
  }
});