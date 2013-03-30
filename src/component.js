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
		var edgeSet = Game.player.graph.graph_edgeSet(D.vector);
		var vertices = edgeSet.endVertices;
		
		// Only add the graph if the player actually travelled the edge
		Game.graph._gamegraph_travelgraph.graphdraw_tryAddEdge(
			new Crafty.math.Vector2D(data.x, data.y),
			new Crafty.math.Vector2D(data.otherX, data.otherY)
		);
		
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
		if (Game.player.centerY() < 0 || Game.player.centerY() > Crafty.canvas._canvas.height)
			console.log("death death death");
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


Crafty.c('GraphDraw', {
	strokeStyle: "#000000",
	lineWidth: 1,
	graphdraw_vertexBaseX: 0,
	graphdraw_vertexBaseY: 0,
	
	_graphdraw_adjacencyList: null,
	_graphdraw_maxX: -Number.MAX_VALUE,
	_graphdraw_maxY: -Number.MAX_VALUE,
	
	init: function() {
		this.requires('CustomDraw, 2D, Center')
		.attr({
			x: 0,
			y: 0,
			w: 1,
			h: 1,
		})
		.bind('Draw', this._graphdraw_draw)
		.bind('Change',this._graphdraw_change);
		this._graphdraw_adjacencyList = [];
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
						return;
				}
				
				// We didn't find our second vertex.  Time to add it!
				edgeset.push(orderedV[1]);
				this._graphdraw_updateDimensions(orderedV[0], orderedV[1]);				
				return this;
			}	
		}
		
		// Oh well, we didn't find our edge.  Add it.
		this._graphdraw_adjacencyList.push(orderedV)
		this._graphdraw_updateDimensions(orderedV[0], orderedV[1]);
		return this;
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
	}
});


Crafty.c('Graph', {
	_graph_adjacencyList: null,
	_graph_labels: null,
	
	init: function() {
		this._graph_adjacencyList = [];
		this._graph_labels = {};
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