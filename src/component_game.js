Crafty.c('GamePiece', {
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
	
	gameplayer_putOnLine: function(x1, y1, x2, y2) {	
		this.slide_setPoint1(x1, y1, ['LEFT_ARROW'])
		.slide_setPoint2(x2, y2, ['RIGHT_ARROW']);
		
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
});

Crafty.c('GameHud', {
	gameHud_startVertex: null,
	gameHud_keyMap: null,
	gameHud_displacement: 20,
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
	gamegraph_travelgraph: null,
	gamegraph_gameplayer: null,
	
	init: function() {
		this.requires('GamePiece, Graph, GraphDraw, StateMachine')
		.bind('Change', this._gamegraph_change)
		.attr({
			lineWidth: 7, 
			strokeStyle: "#FFFFFF"
		});
		
		// Add a function that traces the player's path.
		this.drawFunctions.push(function(data) {
			var ctx = data.ctx;
		
			ctx.lineWidth = this.lineWidth;
			ctx.strokeStyle = "#00FF00";
			ctx.beginPath();
		
			var absPos = this.gamegraph_vertexBase();
			var player = this.gamegraph_gameplayer;
			ctx.moveTo(player.x1 + absPos._x, player.y1 + absPos._y);
			ctx.lineTo(player.centerX(), player.centerY());
		   	
		    ctx.closePath();
		    ctx.stroke();
		});
		
		// Set up our graph's input states
		this.onRegister[R.States.move] = function(state, data) {
			var player = this.gamegraph_gameplayer;
			player.multi_enableControl();
			this.bind(R.Event.sliderHit, this._gamegraph_sliderHit);
		};
		this.onUnregister[R.States.move] = function(state, data) {
			var player = this.gamegraph_gameplayer;
			player.multi_disableControl();
			this.unbind(R.Event.sliderHit, this._gamegraph_sliderHit);
		};
		
		this.onRegister[R.States.chooseDirection] = function(state, data) {
			var hud = this.gamegraph_gameplayer.gameplayer_hud;
			hud.visible = true;
			
			// If we're given data to load, reset the HUD.
			if (data) {
				hud.gameHud_clear();	
				hud.gameHud_load(data);
			}
			
			this.bind('KeyDown', this._gamegraph_waitForHudChoice);
		};
		this.onUnregister[R.States.chooseDirection] = function(state, data) {
			var hud = this.gamegraph_gameplayer.gameplayer_hud;
			hud.visible = false;
			this.unbind('KeyDown', this._gamegraph_waitForHudChoice);
		};
	},
	
	gamegraph_enableDrawing: function() {
		this.enableDrawing();
		this.gamegraph_travelgraph.enableDrawing();
		this.gamegraph_gameplayer.enableDrawing();
		this.gamegraph_gameplayer.gameplayer_hud.enableDrawing();
	},
	
	gamegraph_disableDrawing: function() {
		this.disableDrawing();
		this.gamegraph_travelgraph.disableDrawing();
		this.gamegraph_gameplayer.disableDrawing();
		this.gamegraph_gameplayer.gameplayer_hud.disableDrawing();	
	},
	
	gamegraph_enableState: function() {
		this.transitionTo(this.lastState == R.States.none ? R.States.move : this.lastState);	
	},
	
	gamegraph_disableState: function() {
		this.transitionTo(R.States.none);
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
		for (var i = 0; i < list.length; ++i) {
			v1 = new Crafty.math.Vector2D(list[i][0][0], list[i][0][1]);
			for (var j = 1; j < list[i].length; ++j) {
				v2 = new Crafty.math.Vector2D(list[i][j][0], list[i][j][1]);
				this.graph_unsafeAddEdge(v1, v2);
				this.graphdraw_tryAddEdge(v1, v2);
			}
		}
		
		this.graphdraw_vertexBaseX = graph.vertexBase[0];
		this.graphdraw_vertexBaseY = graph.vertexBase[1];
		this.gamegraph_travelgraph.graphdraw_vertexBaseX = this.graphdraw_vertexBaseX;
		this.gamegraph_travelgraph.graphdraw_vertexBaseY = this.graphdraw_vertexBaseY;
		
		var labels = graph.labels;
		if (labels)
			for (var label in labels) {
				this.graph_addLabel(label, labels[label]);
		}
		
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
		// The vertices we can go to.
		D.vector.x = data.x;
		D.vector.y = data.y;	
		var edgeSet = this.graph_edgeSet(D.vector);
		var vertices = edgeSet.endVertices;
		
		// Only add the edge to our traveled list if the player actually traveled the edge
		var player = this.gamegraph_gameplayer;
		if (player.slideTarget.x == data.x && player.slideTarget.y == data.y) {
			this.gamegraph_travelgraph.graphdraw_tryAddEdge(
				new Crafty.math.Vector2D(data.x, data.y),
				new Crafty.math.Vector2D(data.otherX, data.otherY)
			);
		}
		
		if (!vertices) {
			player.gameplayer_putOnLine(data.x, data.y, data.otherX, data.otherY);
		} else {
			this.transitionTo(R.States.chooseDirection, edgeSet);
		} 
	},
	
	_gamegraph_waitForHudChoice: function(e) {
		var player = this.gamegraph_gameplayer;
		var key = R.CodeToKey[e.key];
		if (player.gameplayer_hud.gameHud_keyMap[key]) {
			var end = player.gameplayer_hud.gameHud_keyMap[key].vertex;
			var start = player.gameplayer_hud.gameHud_startVertex;
			player.gameplayer_putOnLine(start.x, start.y, end.x, end.y);
			this.transitionTo(R.States.move);
		}
	},
});

Crafty.c('GameLevel', {
	graphs: null,
	fromGraphI: -1,
	toGraphI: -1,
	widthToTravel: 0,
	dirToTravel: 0,
	
	init: function() {
		// bind for game-specific functions
		this.requires('StateMachine')
		.bind('EnterFrame', this._gamelevel_enterFrame)
		.bind('KeyDown', this._gamelevel_keydown);
		this.graphs = [];
		
		// Callbacks to allow the graphs to scroll on graph change.
		// When we switch between graphs, we disable input to both and render both.
		this.onRegister[R.States.graphChange] = function(oldState, data) {
			// Our data is the ID of the graph we're switching to.
			this.toGraphI = data;
			this.fromGraphI = oldState;
			
			if (this.fromGraphI < 0) {
				this.widthToTravel = 0;
			} else {
				var thisGraph = this.graphs[this.fromGraphI];
				var thatGraph = this.graphs[this.toGraphI];
				
				if (this.toGraphI < this.fromGraphI) {
					this.widthToTravel = Math.max(Crafty.canvas._canvas.width, thatGraph.w);
					this.dirToTravel = -1;
				} else {
					this.widthToTravel = Math.max(Crafty.canvas._canvas.width, thisGraph.w);
					this.dirToTravel = 1;
				}
					
				thatGraph.attr({
					x: thisGraph.x + (this.widthToTravel * this.dirToTravel)
				});
				
				this.graphs[this.fromGraphI].gamegraph_disableState();				
			}
			
			this.graphs[this.toGraphI].gamegraph_enableDrawing();
			this.bind('EnterFrame', this._gamelevel_graphChange);	
		};
		// After switching between graphs, disable drawing the older graph and
		// enable control over the new graph.
		this.onUnregister[R.States.graphChange] = function() {
			if (this.fromGraphI >= 0) 
				this.graphs[this.fromGraphI].gamegraph_disableDrawing();
				
			this.graphs[this.toGraphI].gamegraph_enableState();
			this.unbind('EnterFrame', this._gamelevel_graphChange);
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
			
			// Set the level's player.  We might change this depending on whether
			// it's better to render the player multiple times.
			var player = Crafty.e('GamePlayer').multi_disableControl();
			var start = this.graphs[i].graph_labelSet('start');
			var hud = Crafty.e('GameHud').centerOn(player.centerX(), player.centerY());
			
			player.gameplayer_setGraph(this.graphs[i]);
			this.graphs[i].gamegraph_setPlayer(player);
			this.graphs[i].gamegraph_gameplayer.gameplayer_setHud(hud);
			
			player.gameplayer_putOnLine(
				start.x1, start.y1,
				start.x2, start.y2
			);
		}
		
		//this.graphs[0].graphgraph_enableState();
		//this.graphs[0].gamegraph
		//this.setCurrentState(0);
		this.transitionTo(R.States.graphChange, 0);
	},
	
	_gamelevel_keydown: function(e) {
		var key = R.CodeToKey[e.key];
		if (key == 'S' && this.currentState != R.States.graphChange) {
			this.transitionTo(R.States.graphChange, (this.currentState + 1) % this.graphs.length);
		}	
	},
	
	_gamelevel_graphChange: function() {
		// Scroll both our current state and new state to center on the new state.
		if (this.widthToTravel > 0) {
			// TODO speed function and disable input while switching
			// TODO maybe float player between swap
			this.graphs[this.toGraphI].x -= 5 * this.dirToTravel;
			this.graphs[this.fromGraphI].x -= 5 * this.dirToTravel;
			this.widthToTravel -= Math.abs(5 * this.dirToTravel);
		} else {
			if (this.fromGraphI >= 0)
				this.graphs[this.fromGraphI].gamegraph_disableDrawing();
			this.transitionTo(this.toGraphI);
		}
	},
	
	_gamelevel_enterFrame: function() {
		// Why the fuck not.
		if (this.currentState >= 0 && this.currentState < this.graphs.length) {
			this.graphs[this.currentState].attr({
				//lineWidth: Game.graph.lineWidth + 0.02,
				y: this.graphs[this.currentState].y - 0.5
			});
			var player = this.graphs[this.currentState].gamegraph_gameplayer;
			if (player.centerY() < 0 || player.centerY() > Crafty.canvas._canvas.height)
				console.log("death death death");
		}
	}
});
