Crafty.c("GameGraph", {
	_gamegraph_require: "GamePiece, Graph, GraphDraw, StateMachine",
		
	gamegraph_travelgraph: null,
	gamegraph_gameplayers: null,
	gamegraph_syscalls: null,
	gamegraph_mutexes: null,
	
	gamegraph_numEdges: 0,
	gamegraph_numTraversedEdges: 0,
	
	currentPlayerI: 0,
	
	init: function() {
		this.bind(R.Event.Remove, this._gamegraph_onRemove).requires(this._gamegraph_require)
		.bind(R.Event.Change, this._gamegraph_change)
		.attr({
			lineWidth: 7, 
			strokeStyle: "#FFFFFF"
		});		
		this.gamegraph_syscalls = {};
		this.gamegraph_gameplayers = [];
		this.gamegraph_mutexes = [];
		
		this._gamegraph_register();
	},
	
	_gamegraph_onRemove: function() {
		this.disableMachine();
		delete this.gamegraph_travelgraph;
		delete this.gamegraph_gameplayers;
		delete this.gamegraph_syscalls;
		delete this.gamegraph_mutexes;
	},
	
	_gamegraph_register: function() {		
		// Add a function that traces the player"s path.
		this.drawFunctions.push(function(data) {
			var ctx = data.ctx;
		
			ctx.save();
			ctx.globalAlpha = this.alpha;		
			ctx.lineWidth = this.lineWidth;
			ctx.strokeStyle = "#00FF00";
			ctx.beginPath();
		
			var absPos = this.gamegraph_vertexBase();
			var player = this.gamegraph_getCurrentPlayer();
			ctx.moveTo(player.x1 + absPos._x, player.y1 + absPos._y);
			ctx.lineTo(player.centerX(), player.centerY());
		   	
		    ctx.closePath();
		    ctx.stroke();
		    ctx.restore();
		});
		
		this.onRegister[this.DISABLED_STATE] = function() {
			this.unbind(R.Event.playerMovement, this._gamegraph_onPlayerMove)
			.unbind(R.Event.sliderHit, this._gamegraph_sliderHit);
			this.gamegraph_getCurrentPlayer().disableMachine();
			for (var i in this.gamegraph_syscalls)
				this.gamegraph_syscalls[i].disableMachine();
		};
		this.onUnregister[this.DISABLED_STATE] = function() {
			this.bind(R.Event.playerMovement, this._gamegraph_onPlayerMove)
			.bind(R.Event.sliderHit, this._gamegraph_sliderHit);
			for (var i in this.gamegraph_syscalls)
				this.gamegraph_syscalls[i].enableMachine();	
			this.gamegraph_getCurrentPlayer().enableMachine();	
		};
	},
	
	gamegraph_setNewPlayer: function(newPlayerI) {	
		if (newPlayerI < 0 || newPlayerI >= this.gamegraph_gameplayers.length)
			return false;
			
		var currPlayer = this.gamegraph_getCurrentPlayer();
		currPlayer.gameplayer_lastGraphY = this.y;
		currPlayer.cascadePropertySet({z:0});
		currPlayer.disableMachine();
		this.currentPlayerI = newPlayerI;
		currPlayer = this.gamegraph_getCurrentPlayer();
		currPlayer.cascadePropertySet({z:1});
		this.gamegraph_getCurrentPlayer().enableMachine();
		this.transitionTo(R.States.normal);
		
		// Player movement triggers checks for changes in the graph.
		// Since other players may have changed the state of the graph,
		// Figure out our new place in the world.
		this._gamegraph_onPlayerMove();
		
		return true;	
	},
	
	gamegraph_setTravelGraph: function(graph) {
		if (!graph) {
			graph = Crafty.e("GraphDraw")
			.attr({
				strokeStyle: "#0000FF", 
				lineWidth: 5
			});
		}
		
		return this.setGameProperty("gamegraph_travelgraph", graph);
	},
	
	gamegraph_getCurrentPlayer: function() {
		return this.gamegraph_gameplayers[this.currentPlayerI];
	},
	
	gamegraph_addPlayer: function(player) {
		if (!player)
			return;
		this.gamegraph_gameplayers.push(player);
		this.attach(player);
	},
	
	gamegraph_removePlayer: function(player) {
		if (!player)
			return;
		this.gamegraph_gameplayers.splice(this.gamegraph_gameplayers.indexOf(player), 1);
		this.detach(player);
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
		
		this.gamegraph_numEdges = this.graph_numEdges;
		
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
		this.graph_addLabel("start", start);

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
		
		var mutexes = graph.mutexes;
		if (mutexes) {
			for (var i = 0; i < mutexes.length; ++i) {
				var mutex = Crafty.e("Mutex");
				mutex.isLocked = mutexes[i].isLocked;
								
				var locks = mutexes[i].locks;
				var keys = mutexes[i].keys;
				
				this.attach(mutex);
				this.gamegraph_mutexes.push(mutex);
				
				
				// Add the graph points, not actual locations
				// since we're drawing a batch of mutex locks/keys.
				for (var j = 0; j < locks.length; ++j) {
					mutex.mutex_addLock(new Crafty.math.Vector2D(
						locks[j][0] * scaleX,
						locks[j][1] * scaleY));	
				}
				
				for (var j = 0; j < keys.length; ++j) {
					mutex.mutex_addKey(new Crafty.math.Vector2D(
						keys[j][0] * scaleX,
						keys[j][1] * scaleY));	
				}
			}
		}

		// Set up the initial start
		this.startData = { hitX: start.x1, hitY: start.y1 };
		this.startState = R.States.chooseDirection;
		
		return this;
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
	
	// When the play hits a node, we determine whether they"ve hit an in-game object
	// or if they need to choose a new path to travel on.
	_gamegraph_sliderHit: function(data) {	
		// Only add the edge to our traveled list if the player actually traveled the edge
		var player = this.gamegraph_getCurrentPlayer();
		if (player.slideTarget.x == data.x && player.slideTarget.y == data.y) {
			 if (this.gamegraph_travelgraph.graphdraw_tryAddEdge(
				new Crafty.math.Vector2D(data.x, data.y),
				new Crafty.math.Vector2D(data.otherX, data.otherY))) {
				++this.gamegraph_numTraversedEdges;
				uiConsole.addLine(this.gamegraph_numTraversedEdges + " vs " + this.gamegraph_numEdges);
			}
		}
		
		for (var i in this.gamegraph_mutexes) {
			this.gamegraph_mutexes[i].trigger(R.Event.sliderHit, this.gamegraph_getCurrentPlayer());
		}
	},

	_gamegraph_onPlayerMove: function() {
		for (var i in this.gamegraph_syscalls) {
			this.gamegraph_syscalls[i].trigger(R.Event.playerMovement, this.gamegraph_getCurrentPlayer());
		}
		
		for (var i in this.gamegraph_mutexes) {
			this.gamegraph_mutexes[i].trigger(R.Event.playerMovement, this.gamegraph_getCurrentPlayer());
		}
	}
});