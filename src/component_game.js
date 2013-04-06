Crafty.c('GamePiece', {
	init: function() {
		this.requires('Cascader');
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

Crafty.c('GamePlayer', {
	gameplayer_graph: null,
	gameplayer_hud: null,
	gameplayer_slideTarget: null,
	
	init: function() {
		this.requires('GamePiece, Slider, Ellipse')
		.bind(R.Event.sliderHit, this._gameplayer_sliderHit)
		.bind("Moved", this._gameplayer_moved)
		.attr({
			lineWidth: 5,
			onClose: 'fill',
			fillStyle: "#FFFFFF",
			w: 30,
			h: 30
		});
			
		this.slideTarget = new Crafty.math.Vector2D();
	},
	
	gameplayer_setGraph: function(graph) {
		this.gameplayer_graph = graph;
		return this;
	},
	
	gameplayer_setHud: function(hud) {
		if (!hud) {
			hud = Crafty.e("GameHud");
			hud.centerOn(this.centerX(), this.centerY());
		}	
		return this.setGameProperty('gameplayer_hud', hud);
	},
	
	gameplayer_putOnLine: function(x1, y1, key1, x2, y2, key2) {	
		this.slide_setPoint1(x1, y1, [key1])
		.slide_setPoint2(x2, y2, [key2]);
		
		this.slideTarget.x = x2;
		this.slideTarget.y = y2;
		
		var absPos = this.gameplayer_graph.gamegraph_vertexBase();
		x1 += absPos._x;
		y1 += absPos._y;

		this.centerOn(x1,y1)
		.slide_anchor(0)
		.slide_setSpeedFunctions(this._gameplayer_speed, this._gameplayer_releaseSpeed)
		.slide_applySettings();
	},
	
	_gameplayer_speed: function(time, speed) {
		return Math.min(time/100, 10);
	},
	
	_gameplayer_releaseSpeed: function(time, releaseSpeed, speed) {
		speed -= 0.5;  return speed < 1 ? NaN : speed;
	},
	
	_gameplayer_sliderHit: function(data) {
		// Ferry the data from us to our game logic.
		this.gameplayer_graph.trigger(R.Event.sliderHit, data);
	},
	
	_gameplayer_moved: function(data) {
		this.gameplayer_graph.trigger(R.Event.playerMovement, data);
	}
});

Crafty.c('GameHud', {
	gameHud_startVertex: null,
	gameHud_keyMap: null,
	gameHud_displacement: 20,
	gameHud_center: "",
	gameHud_syscallKey: "SPACE",
	_gameHud_keyList: ['D', 'C', 'X', 'Z', 'A', 'Q', 'W', 'E'],
	_gameHud_angleList: [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4],
	
	init: function() {
		this.requires('GamePiece, Ellipse')
		.attr({
			lineWidth: 20,
			strokeStyle: "#000000",
			onClose: 'stroke',
			w: 100,
			h: 100,
			visible: false,
			gameHud_displacement: 40
		});
		
		this.drawFunctions.push(this._gameHud_draw);
		this.drawFunctions.unshift(this._gameHud_drawSyscall);
		this.gameHud_keyMap = {};
	},
	
	gameHud_clear: function() {
		this.gameHud_keyMap = {};
	},
	
	gameHud_oppositeKey: function(key) {
		var list = this._gameHud_keyList;
		for (var i = 0; i < list.length; ++i) {
			if (list[i] == key) {
				return list[(i + list.length/2) % list.length];
			}
		}
		return null;
	},
	
	gameHud_lineToKeyPair: function(x1, y1, x2, y2) {
		D.vector.x = x1;
		D.vector.y = y1;
		D.vector2.x = x2;
		D.vector2.y = y2;
		
		D.vector = D.vector2.subtract(D.vector).normalize();
			
		var angle = R.Vector.right.angleBetween(D.vector);
		if (angle < 0)
			angle += 2*Math.PI;

		// Find the closest key-angle to our angle, then verify that there's no other
		var keyData = Tools.toClosest(angle, this._gameHud_angleList);
		var key = this._gameHud_keyList[keyData.i];
		
		// If the player was in the middle of the line, the first key
		// would go towards the first point.  The second key should 
		// represent movement towards the second point.
		return [this.gameHud_oppositeKey(key), key];
	},
	
	gameHud_load: function(data) {
		var edgeset = data.edgeSet;
		this.gameHud_center = data.center;
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
	
	_gameHud_drawSyscall: function(data) {
		var ctx = data.ctx;
		
		if (this.gameHud_center === null || this.gameHud_center === undefined)
			return;
			
		ctx.save();
		
		// draw a black bar in the middle of our thing
		ctx.globalAlpha = this.alpha;
		ctx.fillStyle = this.strokeStyle;			
		var x = data.pos._x + this.lineWidth/2;
		var y = data.pos._y + (data.pos._h-this.lineWidth)/2;
		var w = data.pos._w - this.lineWidth;
		var h = this.lineWidth;
		ctx.fillRect(x, y, w, h);	
		
		ctx.fillStyle = "#FFFFFF";
		ctx.font = "bold 12px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(this.gameHud_center + "", this.centerX(), this.centerY());	
		
		ctx.restore();		
	},
	
	_gameHud_draw: function(data) {
		var ctx = data.ctx;
		
		ctx.save();
		
		ctx.globalAlpha = this.alpha;
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
	gamegraph_travelgraph: null,
	gamegraph_gameplayer: null,
	gamegraph_syscalls: null,
	
	_activeSyscall: null,
	
	init: function() {
		this.requires('GamePiece, Graph, GraphDraw, StateMachine')
		.bind('Change', this._gamegraph_change)
		.attr({
			lineWidth: 7, 
			strokeStyle: "#FFFFFF"
		});
		
		this.gamegraph_syscalls = {};
		
		// Add a function that traces the player's path.
		this.drawFunctions.push(function(data) {
			var ctx = data.ctx;
		
			ctx.save();
			ctx.globalAlpha = this.alpha;		
			ctx.lineWidth = this.lineWidth;
			ctx.strokeStyle = "#00FF00";
			ctx.beginPath();
		
			var absPos = this.gamegraph_vertexBase();
			var player = this.gamegraph_gameplayer;
			ctx.moveTo(player.x1 + absPos._x, player.y1 + absPos._y);
			ctx.lineTo(player.centerX(), player.centerY());
		   	
		    ctx.closePath();
		    ctx.stroke();
		    ctx.restore();
		});
		
		// Set up our graph's input states
		this.onRegister[R.States.move] = function(state, data) {
			var player = this.gamegraph_gameplayer;
			player.multi_enableControl();
			this.bind(R.Event.sliderHit, this._gamegraph_sliderHit)
			.bind(R.Event.playerMovment, this._gamegraph_checkForSyscall);
		};
		this.onUnregister[R.States.move] = function(state, data) {
			var player = this.gamegraph_gameplayer;
			player.multi_disableControl();
			this.unbind(R.Event.sliderHit, this._gamegraph_sliderHit)
			.unbind(R.Event.playerMovment, this._gamegraph_checkForSyscall);
		};
		
		this.onRegister[R.States.chooseDirection] = function(state, data) {
			var hud = this.gamegraph_gameplayer.gameplayer_hud;
			hud.visible = true;
			
			if (data) {
				D.vector.x = data.hitX;
				D.vector.y = data.hitY;	
				data.edgeSet = this.graph_edgeSet(D.vector);

				hud.gameHud_clear();	
				hud.gameHud_load(data);
			}
			this.bind('KeyDown', this._gamegraph_waitForHudChoice);
		};
		this.onUnregister[R.States.chooseDirection] = function(state, data) {
			var hud = this.gamegraph_gameplayer.gameplayer_hud;
			if (state !== this.DISABLED_STATE)
				hud.visible = false;
			this.unbind('KeyDown', this._gamegraph_waitForHudChoice);
		};
		
		this.onRegister[this.DISABLED_STATE] = function() {
			this.unbind(R.Event.syscallFocused, this._gamegraph_syscallFocused);
			for (var i in this.gamegraph_syscalls)
				this.gamegraph_syscalls[i].disableMachine();
		};
		this.onUnregister[this.DISABLED_STATE] = function() {
			this.bind(R.Event.syscallFocused, this._gamegraph_syscallFocused);
			for (var i in this.gamegraph_syscalls)
				this.gamegraph_syscalls[i].enableMachine();		
		};
	},
	
	gamegraph_setTravelGraph: function(graph) {
		if (!graph) {
			graph = Crafty.e('GraphDraw')
			.attr({
				strokeStyle: "#0000FF", 
				lineWidth: 5
			});
		}
		
		return this.setGameProperty('gamegraph_travelgraph', graph);
	},
	
	gamegraph_setPlayer: function(player) {
		if (!player) {
			player = Crafty.e('gameplayer');		
		}
		
		return this.setGameProperty('gamegraph_gameplayer', player);
	},
	
	gamegraph_load: function(graph) {
		var list = graph.list;
		var v1, v2;
		
		var scaleX = KernelPanic.settings.scaleX;
		var scaleY = KernelPanic.settings.scaleY;
		
		this.graphdraw_vertexBaseX = graph.vertexBase[0] * scaleX;
		this.graphdraw_vertexBaseY = graph.vertexBase[1] * scaleY;
		this.gamegraph_travelgraph.graphdraw_vertexBaseX = this.graphdraw_vertexBaseX;
		this.gamegraph_travelgraph.graphdraw_vertexBaseY = this.graphdraw_vertexBaseY;
		
		for (var i = 0; i < list.length; ++i) {
			v1 = new Crafty.math.Vector2D(list[i][0][0] * scaleX, list[i][0][1] * scaleY);
			for (var j = 1; j < list[i].length; ++j) {
				v2 = new Crafty.math.Vector2D(list[i][j][0] * scaleX, list[i][j][1] * scaleY);
				this.graph_unsafeAddEdge(v1, v2);
				this.graphdraw_tryAddEdge(v1, v2);
			}
		}
		
		var labels = graph.labels;
		if (labels) {
			for (var label in labels) {
				this.graph_addLabel(label, labels[label]);
			}
		}
		
		var start = {
			x1: graph.start.x1 * scaleX,
			x2: graph.start.x2 * scaleX,
			y1: graph.start.y1 * scaleY,
			y2: graph.start.y2 * scaleY
		};
		this.graph_addLabel('start', start);

		var syscalls = graph.syscalls;
		var absPos = this.gamegraph_vertexBase();
		var i = 0;
		if (syscalls) {
			for (var syscall in syscalls) {
				for (var j = 0; j < syscalls[syscall].length; ++j) {
					// Attach each syscall entity to the graph
					this.gamegraph_syscalls[i] = Crafty.e(syscall).centerOn(
						syscalls[syscall][j][0] * scaleX + absPos._x,
						syscalls[syscall][j][1] * scaleY + absPos._y
					);
					this.attach(this.gamegraph_syscalls[i]);
					this.gamegraph_syscalls[i].syscallId = i;
					++i;	
				}
			}
		}

		// Set up the initial start
		this.startData = { hitX: start.x1, hitY: start.y1 };
		this.startState = R.States.chooseDirection;
				
		return this;
	},
	
	gamegraph_addTraveledEdge: function(v1, v2) {
		this.gamegraph_travelgraph.graphdraw_tryAddEdge(v1, v2);
	},
	
	gamegraph_vertexBase: function() {
		return this.graphdraw_vertexBase();
	},
	
	_gamegraph_change: function(e) {
		if (e.gamegraph_travelgraph) {
			e.gamegraph_travelgraph.x = this.x + this.lineWidth/2 - e.gamegraph_travelgraph.lineWidth/2;
			e.gamegraph_travelgraph.y = this.y + this.lineWidth/2 - e.gamegraph_travelgraph.lineWidth/2;	
		}
		
		if (e.lineWidth !== undefined && this.gamegraph_travelgraph) {
			this.gamegraph_travelgraph.x = this.x + e.lineWidth/2 - this.gamegraph_travelgraph.lineWidth/2;
			this.gamegraph_travelgraph.y = this.y + e.lineWidth/2 - this.gamegraph_travelgraph.lineWidth/2;
		}
	},
	
	// When the play hits a node, we determine whether they've hit an in-game object
	// or if they need to choose a new path to travel on.
	_gamegraph_sliderHit: function(data) {	
		// Only add the edge to our traveled list if the player actually traveled the edge
		var player = this.gamegraph_gameplayer;
		if (player.slideTarget.x == data.x && player.slideTarget.y == data.y) {
			this.gamegraph_travelgraph.graphdraw_tryAddEdge(
				new Crafty.math.Vector2D(data.x, data.y),
				new Crafty.math.Vector2D(data.otherX, data.otherY)
			);
		}
		
		// Are any of our syscalls active?  If so, we want to allow the player to activate the syscall
		var data = {
			center: (this._activeSyscall) ? this._activeSyscall.syscallName : null,
			hitX: data.x,
			hitY: data.y
		};

		this.transitionTo(R.States.chooseDirection, data); 
	},
	
	_gamegraph_waitForHudChoice: function(e) {
		var player = this.gamegraph_gameplayer;
		var key = R.CodeToKey[e.key];
		if (player.gameplayer_hud.gameHud_keyMap[key]) {
			var end = player.gameplayer_hud.gameHud_keyMap[key].vertex;
			var start = player.gameplayer_hud.gameHud_startVertex;
			
			// Put on line, set keys for movement
			player.gameplayer_putOnLine(start.x, start.y, player.gameplayer_hud.gameHud_oppositeKey(key),
				end.x, end.y, key);
			
			this.transitionTo(R.States.move);
		} else if (this._activeSyscall && key == player.gameplayer_hud.gameHud_syscallKey) {
			this._activeSyscall.trigger(R.Event.syscallActivate, this);
		}
	},
	
	_gamegraph_checkForSyscall: function(e) {
		// Let each syscall check whether they're colliding with the player or not
		for (var i in this.gamegraph_syscalls) {
			this.gamegraph_syscalls[i].trigger(R.States.playerMovement, this.gamegraph_gameplayer);
		}
	},
	
	_gamegraph_syscallFocused: function(e) {
		// We may change our focus to a new syscall, otherwise if we lose focus
		// we set our active syscall to null.
		if (e.isFocused) {
			this._activeSyscall = e.syscall;
		} else if (e.syscall == this._activeSyscall) {
			//delete this.gamegraph_syscalls[e.syscall.syscallId];
			//e.syscall.destroy();
			this._activeSyscall = null;
		}
	}
});

Crafty.c('GameLevel', {
	graphs: null,
	fromGraphI: -1,
	toGraphI: -1,
	currentI: -1,
	seekVehicle: null,
	
	init: function() {
		// bind for game-specific functions
		this.requires('StateMachine');
		this.graphs = [];
		this.seekVehicle = Crafty.e('Vehicle');
		
		// Callbacks to allow the graphs to scroll on graph change.
		// When we switch between graphs, we disable input to both and render both.
		this.onRegister[R.States.levelNormal] = function(oldState, data) {
			this.bind('EnterFrame', this._gamelevel_enterFrame)
			.bind('KeyDown', this._gamelevel_keydown);
		};
		this.onUnregister[R.States.levelNormal] = function() {
			this.unbind('EnterFrame', this._gamelevel_enterFrame)
			.unbind('KeyDown', this._gamelevel_keydown);
		};
		
		this.onRegister[R.States.graphChange] = function(oldState, data) {
			// Our data is the ID of the graph we're switching to.
			this.toGraphI = data;
			this.fromGraphI = this.currentI;
			this.currentI = this.toGraphI;
			
			var fromGraph = this.graphs[this.fromGraphI];
			var toGraph = this.graphs[this.toGraphI];
			var distance = 0;
			
			toGraph.enableDrawing();
			
			if (this.fromGraphI >= 0 ) {				
				distance = (this.toGraphI < this.fromGraphI) ?
					-Math.max(Crafty.canvas._canvas.width, toGraph.w) :
					Math.max(Crafty.canvas._canvas.width, fromGraph.w);
				
				fromGraph.disableMachine();		
				toGraph.attr({
					x: fromGraph.x + distance
				});				
			}
				
			if (this.fromGraphI >= 0) {
				fromGraph.disableMachine();
				this.seekVehicle.setSeek(Crafty.viewport, {x: Crafty.viewport.x - distance, y: 0});
				this.bind('EnterFrame', this._gamelevel_graphChange);
			} else {
				toGraph.enableMachine();
				this.transitionTo(R.States.levelNormal);
			} 	
		};
		// After switching between graphs, disable drawing the older graph and
		// enable control over the new graph.
		this.onUnregister[R.States.graphChange] = function() {
			if (this.fromGraphI >= 0)
				this.graphs[this.fromGraphI].disableDrawing();				
			this.graphs[this.toGraphI].enableMachine();
			this.unbind('EnterFrame', this._gamelevel_graphChange);
			
			Crafty.trigger(R.Event.levelGraphSwitched, {
				oldGraph: (this.fromGraphI >= 0) ? this.graphs[this.fromGraphI] : null,
				newGraph: this.graphs[this.toGraphI]
			});
		};
	},
	
	load: function(graphs) {
		// Load all of our graphs at once! 
		for (var i = 0; i < graphs.length; ++i) {
			// For each graph, a travel graph...
			this.graphs[i] = Crafty.e('GameGraph')
				.gamegraph_setTravelGraph()
				.gamegraph_load(graphs[i])
				.graph_makeUndirected()
				.centerOnX(Crafty.canvas._canvas.width/2);
				
			this.graphs[i].gamegraph_travelgraph.attr({
				lineWidth: 5,
				strokeStyle: "#00FF66"
			});
			
			this.gamelevel_createPlayer(this.graphs[i]);
		}

		this.enableMachine(R.States.graphChange, 0);
		return this;
	},
	
	gamelevel_createPlayer: function(graph) {
		// Set the level's player.  We might change this depending on whether
		// it's better to render the player multiple times.
		var player = Crafty.e('GamePlayer').multi_disableControl();
		var start = graph.graph_labelSet('start');
		var hud = Crafty.e('GameHud').centerOn(player.centerX(), player.centerY());
			
		player.gameplayer_setGraph(graph);
		graph.gamegraph_setPlayer(player);
		graph.gamegraph_gameplayer.gameplayer_setHud(hud);
			
		// Uh...should probably set the game to wait for user input by default
		var keys = player.gameplayer_hud.gameHud_lineToKeyPair(start.x1, start.y1, start.x2, start.y2);
		player.gameplayer_putOnLine(
			start.x1, start.y1, keys[0],
			start.x2, start.y2, keys[1]
		);
		
		return player;	
	},
	
	gamelevel_toNextGraph: function() {
		if (this.graphs.length > 1)
			this.transitionTo(R.States.graphChange, (this.currentI+ 1) % this.graphs.length);
	},
	
	_gamelevel_keydown: function(e) {
		var key = R.CodeToKey[e.key];
		if (key == 'S' && this.currentState != R.States.graphChange) {
			this.gamelevel_toNextGraph();
		}	
	},
	
	_gamelevel_graphChange: function() {
		// Scroll the viewport until we're centered on our new graph.
		if (this.seekVehicle.seek()) {
			this.transitionTo(R.States.levelNormal);
		}
	},
	
	_gamelevel_enterFrame: function() {
		this.graphs[this.currentI].attr({
			y: this.graphs[this.currentI].y - 0.5
		});
		
		// TODO At some point we need some real death.
		var player = this.graphs[this.currentI].gamegraph_gameplayer;
		if (player.centerY() < 0 || player.centerY() > Crafty.canvas._canvas.height)
			console.log("death death death");
	}
});
