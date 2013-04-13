Crafty.c("GameLevel", {
	_gamelevel_require: "StateMachine, Vehicle",
		
	init: function() {
		// bind for game-specific functions
		this.requires(this._gamelevel_require)
		.bind(R.Event.Win, this._gamelevel_onWin)
		.bind(R.Event.Lose, this._gamelevel_onLose);
		
		this.objDataToLoad = [];
		
		this.fromI = -1;
		this.toI = -1;
		this.currentI = -1;
		
		this.fromObj = null;
		this.toObj = null;
		this.currentObj = null;
		
		this._gamelevel_register();
	},
	
	_gamelevel_destroy: function() {
		// Empty out our callbacks -- we don't care about cleaning up state
		this.onRegister = {};
		this.onUnregister = {};
		
		this.disableMachine();
		this.objDataToLoad.length = 0;
		delete this.objDataToLoad;
		
		delete this.fromObj;
		delete this.toObj;
		delete this.currentObj;
		
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
			this.toI = data;
			this.fromI = this.currentI;
			this.currentI = this.toI;
			
			this.toObj = (this.toI >= 0) ? this.load(this.objDataToLoad[this.toI]) : null;
			this.fromObj = this.currentObj;
			this.currentObj = this.toObj;
			
			var scrollToX = Crafty.viewport.x;
			var toObj = this.toObj;
			var fromObj = this.fromObj;
			
			// Case I: Scroll someting into view, but don't worry about our old object
			if (!fromObj && toObj) {
				toObj.attr({
					x: Crafty.viewport.x + Crafty.viewport.width
				});
				scrollToX = -(toObj.getDefinedCenterX() - KernelPanic.settings.getGraphCenterOnX());
			}
			
			// Case II: We just want to scroll away from something
			else if (fromObj && !toObj) {
				scrollToX = -(fromObj.x + fromObj.w);
			}
			
			// Case III:  Scroll from and to objects
			else if (fromObj && toObj) {
				toObj.attr({
					x: fromObj.x + fromObj.w + Crafty.viewport.width
				});
				scrollToX = -(toObj.getDefinedCenterX() - KernelPanic.settings.getGraphCenterOnX());	
			}
			
			if (toObj)
				toObj.enableDrawing();
				
			this.setSeek({ x: scrollToX, y: 0 }, Crafty.viewport);
			this.bind("SeekDone", this._gamelevel_onSeekDone);	
		};
		this.onUnregister[R.States.graphChange] = function() {			
			if (this.fromObj) {
				this.fromObj.disableDrawing();
				this.fromObj.disableMachine();
				this.fromObj.destroy();
				this.fromObj = null;
			}
			
			if (this.toObj) {
				this.toObj.enableMachine();
			}
		};
		
		this.onRegister[R.States.playerChange] = function() {
			var graph = this.currentObj;				
			graph.disableMachine();
			this.setSeek({x: graph.x, y: graph.gamegraph_getCurrentPlayer().gameplayer_lastGraphY}, graph);
			this.bind("SeekDone", this._gamelevel_onSeekDone);
		};
		this.onUnregister[R.States.playerChange] = function() {
			this.currentObj.enableMachine().enableDrawing();
		};
	},
	
	load: function(objData) {
		var obj = null;
		
		if (typeof objData == "string") {
			obj = Crafty.e("GamePopup")
				.popup_load(Crafty.assets[objData]);
		} else {
			obj = Crafty.e("GameGraph")
				.gamegraph_setTravelGraph()
				.gamegraph_load(objData)
				.graph_makeUndirected()
				.centerOnX(KernelPanic.settings.getGraphCenterOnX());
				
			obj.gamegraph_travelgraph.attr({
				lineWidth: 5,
				strokeStyle: "#00FF66",
			});
				
			obj.gamegraph_numEdges = obj.graph_numEdges / 2;
			this.gamelevel_createPlayer(obj);
		}
		return obj;
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
			
		// The player is, by default, set to wait for user input
		player.gameplayer_putOnPoint(start.x1, start.y1);
		player.gameplayer_lastGraphY = 0;
	
		player.startData = { hitX: start.x1, hitY: start.y1 };
		player.startState = R.States.chooseDirection;
		
		return player;	
	},

	gamelevel_getCurrentGraph: function() {
		return this.currentObj;
	},
	
	gamelevel_toNextPlayer: function(i, beSafe) {
		var graph = this.currentObj;
		var secondIndex = graph.currentPlayerI + 1;
		
		if (beSafe)
			secondIndex %= graph.gamegraph_gameplayers.length;
			
		i = (i === undefined) ? secondIndex : i;
		if (graph.gamegraph_setNewPlayer(i)) {
			this.transitionTo(R.States.playerChange);
			return true;
		}
		return false;
	},
	
	gamelevel_toNextGraph: function(i, beSafe) {
		var secondIndex = this.currentI + 1;
		
		if (beSafe)
			secondIndex %= this.objDataToLoad.length;
			
		i = (i === undefined) ? secondIndex : i;
		if (this.objDataToLoad.length > 1) {
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
			this.gamelevel_toNextPlayer(undefined, true);
		}	
	},
	
	_gamelevel_onSeekDone: function() {
		this.unbind("SeekDone", this._gamelevel_onSeekDone);
		this.transitionTo(R.States.normal);
	},
	
	_gamelevel_enterFrame: function() {
		if (this.currentObj.__c["GameGraph"]) {
			this.currentObj.attr({
				y: this.currentObj.y - this.currentObj.speedDown
			});
	
			var player = this.currentObj.gamegraph_getCurrentPlayer();			
			if (player.centerY() < 0 || player.centerY() > Crafty.canvas._canvas.height) {
				this.trigger(R.Event.Lose);
			}
		}
	},
	
	_gamelevel_onLose: function() {
		uiConsole.addLine("LOSER, try again");
		Crafty.assets[R.UI.console] = KernelPanic.UI.innerHTML;
		
		this.currentObj.gamegraph_reset();
	},
	
	_gamelevel_onWin: function() {
		uiConsole.addLine("You win!");
		Crafty.assets[R.UI.console] = KernelPanic.UI.innerHTML;

		this._gamelevel_destroy();
		Crafty.scene(R.Scene.prototype_intro);
	}
});