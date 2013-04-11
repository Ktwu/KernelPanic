Crafty.c("GameLevel", {
	_gamelevel_require: "StateMachine",
		
	init: function() {
		// bind for game-specific functions
		this.requires(this._gamelevel_require)
		.bind(R.Event.Win, this._gamelevel_onWin)
		.bind(R.Event.Lose, this._gamelevel_onLose);
		
		this.graphs = [];
		this.seekVehicle = Crafty.e("Vehicle");
		this.fromGraphI = -1;
		this.toGraphI = -1;
		this.currentI = -1;
		
		this._gamelevel_register();
	},
	
	_gamelevel_destroy: function() {
		// Empty out our callbacks -- we don't care about cleaning up state
		this.onRegister = {};
		this.onUnregister = {};
		
		this.disableMachine();
		this.graphs.length = 0;
		delete this.graphs;
		delete this.seekVehicle;
		
		Crafty.viewport.x = 0;
		Crafty.viewport.y = 0;
		
		this.destroy();
	},
	
	_gamelevel_register: function() {	
		// Callbacks to allow the graphs to scroll on graph change.
		// When we switch between graphs, we disable input to both and render both.
		this.onRegister[R.States.normal] = function(oldState, data) {
			this.bind(R.Event.EnterFrame, this._gamelevel_enterFrame)
			.bind(R.Event.KeyDown, this._gamelevel_keydown);
		};
		this.onUnregister[R.States.normal] = function() {
			this.unbind(R.Event.EnterFrame, this._gamelevel_enterFrame)
			.unbind(R.Event.KeyDown, this._gamelevel_keydown);
		};
		
		this.onRegister[R.States.graphChange] = function(oldState, data) {
			// Our data is the ID of the graph we"re switching to.
			this.toGraphI = data;
			this.fromGraphI = this.currentI;
			this.currentI = this.toGraphI;
			
			var fromGraph = this.graphs[this.fromGraphI];
			var toGraph = this.graphs[this.toGraphI];
			var distance = 0;
			
			toGraph.enableDrawing();
			
			// So I want to seek the viewport such that the difference between the viewport's
			// final X and the graph's centered X (where its X is after centering its start point)
			// is the scale width.  Why iqqqzaazaaaasn't this easy.
			if (this.fromGraphI >= 0 ) {				
				distance = (this.toGraphI < this.fromGraphI) ?
					-Math.max(Crafty.canvas._canvas.width, toGraph.w) :
					Math.max(Crafty.canvas._canvas.width, fromGraph.w);
				
				fromGraph.disableMachine();		
				toGraph.attr({
					x: fromGraph.x + distance,
					y: toGraph.gamegraph_getCurrentPlayer().gameplayer_lastGraphY
				});				
								
				fromGraph.disableMachine();
				this.seekVehicle.setSeek(Crafty.viewport, {
						x: -(toGraph.graphdraw_vertexBase()._x + toGraph.graph_labelSet('start').x1 - KernelPanic.settings.getGraphCenterOnX()),
						y: 0
				});
				
				this.bind(R.Event.EnterFrame, this._gamelevel_change);
			} else {
				toGraph.enableMachine();
				this.transitionTo(R.States.normal);
			} 	
		};
		// After switching between graphs, disable drawing the older graph and
		// enable control over the new graph.
		this.onUnregister[R.States.graphChange] = function() {
			if (this.fromGraphI >= 0)
				this.graphs[this.fromGraphI].disableDrawing();				
			this.graphs[this.toGraphI].enableMachine();
			this.unbind(R.Event.EnterFrame, this._gamelevel_change);
			
			Crafty.trigger(R.Event.levelGraphSwitched, {
				oldGraph: (this.fromGraphI >= 0) ? this.graphs[this.fromGraphI] : null,
				newGraph: this.graphs[this.toGraphI]
			});
		};
		
		this.onRegister[R.States.playerChange] = function() {
			// Our data is the ID of the graph we"re switching to.
			var graph = this.graphs[this.currentI];				
			graph.disableMachine();
			this.seekVehicle.setSeek(graph, {x: graph.x, y: graph.gamegraph_getCurrentPlayer().gameplayer_lastGraphY});
			this.bind(R.Event.EnterFrame, this._gamelevel_change);
			
			// Silly hack to get the new player to render on top
			var player = graph.gamegraph_getCurrentPlayer();
		};
		// After switching between graphs, disable drawing the older graph and
		// enable control over the new graph.
		this.onUnregister[R.States.playerChange] = function() {
			this.unbind(R.Event.EnterFrame, this._gamelevel_change);
			this.graphs[this.currentI].enableMachine();
		};
	},
	
	load: function(graphs) {
		// Load all of our graphs at once! 
		for (var i = 0; i < graphs.length; ++i) {
			// For each graph, a travel graph...
			this.graphs[i] = Crafty.e("GameGraph")
				.gamegraph_setTravelGraph()
				.gamegraph_load(graphs[i])
				.graph_makeUndirected()
				.centerOnX(KernelPanic.settings.getGraphCenterOnX());
			
			this.graphs[i].gamegraph_travelgraph.attr({
				lineWidth: 5,
				strokeStyle: "#00FF66",
			});
			
			this.graphs[i].gamegraph_numEdges = this.graphs[i].graph_numEdges / 2;
			
			this.gamelevel_createPlayer(this.graphs[i]);
		}

		this.enableMachine(R.States.graphChange, 0);
		return this;
	},
	
	gamelevel_createPlayer: function(graph) {
		// Set the level"s player.  We might change this depending on whether
		// it"s better to render the player multiple times.
		var player = Crafty.e("GamePlayer").multi_disableControl();
		var start = graph.graph_labelSet("start");
		var hud = Crafty.e("GameHud").centerOn(player.centerX(), player.centerY());
			
		player.gameplayer_setGraph(graph);
		player.gameplayer_setHud(hud);
		graph.gamegraph_addPlayer(player);
			
		// Uh...should probably set the game to wait for user input by default
		var keys = player.gameplayer_hud.gamehud_lineToKeyPair(start.x1, start.y1, start.x2, start.y2);
		player.gameplayer_putOnLine(
			start.x1, start.y1, keys[0],
			start.x2, start.y2, keys[1]
		);
		player.gameplayer_lastGraphY = 0;
		
		// Prepare the player to be enabled...
		// ...by using a silly hack to get the new player to start drawing its HUD immediately on creation.
		player.enableMachine(R.States.chooseDirection, { hitX: start.x1, hitY: start.y1 });
		player.disableMachine();
		
		return player;	
	},

	gamelevel_getCurrentGraph: function() {
		return this.graphs[this.currentI];
	},
	
	gamelevel_toNextPlayer: function(i, beSafe) {
		var graph = this.graphs[this.currentI];
		var secondIndex = graph.currentPlayerI + 1;
		
		if (beSafe)
			secondIndex %= graph.gamegraph_gameplayers.length;
			
		i = (i === undefined) ? secondIndex : i;
		if (this.graphs[this.currentI].gamegraph_setNewPlayer(i)) {
			this.transitionTo(R.States.playerChange);
			return true;
		}
		return false;
	},
	
	gamelevel_toNextGraph: function(i, beSafe) {
		var secondIndex = this.currentI + 1;
		
		if (beSafe)
			secondIndex %= this.graphs.length;
			
		i = (i === undefined) ? secondIndex : i;
		if (this.graphs.length > 1) {
			this.transitionTo(R.States.graphChange, secondIndex);
			return true;
		}
		return false;
	},
	
	_gamelevel_keydown: function(e) {
		var key = R.CodeToKey[e.key];
		if (key == "S" && this.currentState == R.States.normal) {
			// Should we transition between players instead?
			// If not, tell the graph which player to set for next time, then
			// switch to a new graph instead.
			if (!this.gamelevel_toNextPlayer(undefined, true)) {
				this.graphs[this.currentI].gamegraph_setNewPlayer(0, true);
				this.gamelevel_toNextGraph(undefined, true);
			}
		}	
	},
	
	_gamelevel_change: function() {
		// Scroll the viewport until we"re centered on our new graph.
		if (this.seekVehicle.seek()) {
			this.transitionTo(R.States.normal);
		}
	},
	
	_gamelevel_enterFrame: function() {
		this.graphs[this.currentI].attr({
			y: this.graphs[this.currentI].y - 0.5
		});
		
		// TODO At some point we need some real death.
		// Real death should...restart the level.
		var player = this.graphs[this.currentI].gamegraph_getCurrentPlayer();			
		if (player.centerY() < 0 || player.centerY() > Crafty.canvas._canvas.height) {
			this.trigger(R.Event.Lose);
		}
	},
	
	_gamelevel_onLose: function() {
		uiConsole.addLine("LOSER >:P");
		Crafty.assets[R.UI.console] = KernelPanic.UI.innerHTML;
		
		console.log('lose');
		this._gamelevel_destroy();
		Crafty.scene(R.Scene.game);
	},
	
	_gamelevel_onWin: function() {
		uiConsole.addLine("You win!");
		Crafty.assets[R.UI.console] = KernelPanic.UI.innerHTML;
		
		console.log('win');
		this._gamelevel_destroy();
		Crafty.scene(R.Scene.prototype_intro);
	}
});