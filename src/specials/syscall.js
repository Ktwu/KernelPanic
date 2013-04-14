Crafty.c('Syscall', {
	syscallName: null,
	blinkStyle: null,
	steadyStyle: null,
	syscallId: -1,
	
	_percent: 0,

	init: function() {
		this.requires('GamePiece, Ellipse, StateMachine')
		.attr({
			lineWidth: 2,
			fillStyle: "#0000FF",
			blinkStyle: '#FFFF00',
			steadyStyle: '#0000FF',
			onClose: 'fill',
			w: 40,
			h: 40,
		});
		
		this.drawFunctions.push(this._syscall_changeGradient);
		
		this.onRegister[this.DISABLED_STATE] = function() {
			this.unbind(R.Event.playerMovement, this._syscall_checkForCollision);
		};
		this.onUnregister[this.DISABLED_STATE] = function() {
			this.bind(R.Event.playerMovement, this._syscall_checkForCollision);
		};
		
		this.onRegister[R.States.focused] = function(oldState, player) {
			if (player) {
				player.activeSyscall = this;
			}
		};
		this.onUnregister[R.States.focused] = function(newState, player) {
			if (player && player.activeSyscall == this) {
				player.activeSyscall = null;
			}
		};
		
		this.onRegister[R.States.dead] = function() {
			this.visible = false;
			this.unbind(R.Event.playerMovement, this._syscall_checkForCollision);
		};
		this.onUnregister[R.States.dead] = function(newState) {
			if (newState != this.DISABLED_STATE) {
				this.visible = true;
			}
			this.bind(R.Event.playerMovement, this._syscall_checkForCollision);
		};

		this.startState = R.States.normal;
	},
	
	syscall_reset: function() {
		this.transitionTo(R.States.normal);
	},
	
	_syscall_checkForCollision: function(player) {
		if (this.currentState == R.States.dead || this.currentState == R.States.active)
			return;
			
		if (Math.abs(player.x - this.x) < player.w/2+this.w/2
			&& Math.abs(player.y - this.y) < player.h/2+this.h/2) {
				// Did we collide?
				this.transitionTo(R.States.focused, player);
		} else {
			// No collision?
			if (this.currentState == R.States.focused)
				this.transitionTo(R.States.normal, player);
		}
	},
	
	_syscall_changeGradient: function() {
		if (this.currentState == R.States.focused) {
			this._percent = (this._percent + 0.05) % 1;
			var grd = Crafty.canvas.context.createRadialGradient(this.centerX(), this.centerY(), 0, this.centerX(), this.centerY(), this.w/2);
			grd.addColorStop(1, this.steadyStyle);
			grd.addColorStop(0, this.steadyStyle);
			grd.addColorStop(this._percent, this.blinkStyle);
			this.fillStyle = grd;
		} else {
			this.fillStyle = this.steadyStyle;
		}
	}
});

Crafty.c('Exec', {
	init: function() {
		this.requires('Syscall')
		.attr({
			syscallName: 'Exec'
		})
		.bind(R.Event.syscallActivate, this._exec_activate);
	},
	
	_exec_activate: function(graph) {
		uiConsole.addLine(R.UiConsoleMessages.EXEC);
			
		// Graph, we don't want any input from you.  Shut up for a bit.
		graph.transitionTo(R.States.active);
		graph.gamegraph_getCurrentPlayer().activeSyscall = null;
		
		// We're going to create another player up at the top of the graph, back at start.
		// We'll then get the graph to scroll back up to the top.  Then, we'll
		// get rid of the old player.
		var exec = this;
		var oldPlayer = graph.gamegraph_getCurrentPlayer();
		
		var player = Crafty.e("GamePlayer").multi_disableControl();
		var start = graph.graph_labelSet("start");
		var hud = Crafty.e("GameHud").centerOn(player.centerX(), player.centerY());
			
		player.gameplayer_setGraph(graph);
		player.gameplayer_setHud(hud);
		graph.gamegraph_replacePlayer(oldPlayer, player);

		player.gameplayer_putOnPoint(start.x1, start.y1);
		player.gameplayer_lastGraphY = 0;	
		player.startData = { hitX: start.x1, hitY: start.y1 };	
		player.startState = R.States.chooseDirection;
		
		player.enableDrawing();
		graph.attach(oldPlayer);
		
		// Communicate our behavior to the current level to scroll back to y = 0!
		// And we sort of do this by hijacking its state machine.  Totally legit!
		var seekDoneFunction = function() {
			this.unbind("SeekDone", seekDoneFunction);
			this.transitionTo(R.States.normal);
		};
		
		KernelPanic.currentLevel.onRegister[R.States.active] = function() {
			// Remember, the context this is called in is the level.
			this.setSeek({x: graph.x, y: 0}, graph);
			this.bind("SeekDone", seekDoneFunction);
		};
		KernelPanic.currentLevel.onUnregister[R.States.active] = function() {
			exec.transitionTo(R.States.dead);
			
			// Kill the old player.
			graph.detach(oldPlayer);
			oldPlayer.destroy();
			
			// Activate our new player
			player.enableMachine();
			graph.transitionTo(R.States.normal);
		};
		
		// Time to set our level to action!
		KernelPanic.currentLevel.transitionTo(R.States.active);
	},
});

Crafty.c('Fork', {
	init: function() {
		this.requires('Syscall')
		.attr({
			steadyStyle: "#FF0000",
			syscallName: 'Fork'
		})
		.bind(R.Event.syscallActivate, this._fork_activate);
	},
	
	_fork_activate: function(graph) {
		uiConsole.addLine(R.UiConsoleMessages.FORK);
		this.transitionTo(R.States.dead);
		
		var player = graph.gamegraph_getCurrentPlayer();
		var newPlayer = KernelPanic.currentLevel.gamelevel_createPlayer(graph, player).enableDrawing();
		
		player.activeSyscall = null;
		player.gameplayer_hud.gamehud_syscallName = null;
	}
});

Crafty.c('Vanish', {
	_vanish_graph: null,
	_vanish_oldI: 0,
	
	init: function() {
		this.requires('Syscall')
		.attr({
			steadyStyle: "#FF00FF",
			syscallName: 'Vanish'
		})
		.bind(R.Event.syscallActivate, this._vanish_activate);
	},
	
	// The Vanish mechanic causes everything to fade from view, which means playing with alphas.
	// Afterwards we swap to another graph and destroy the one that vanished.
	_vanish_activate: function(graph) {	
		uiConsole.addLine(R.UiConsoleMessages.VANISH);
		
		// Graph, we don't want any input from you
		graph.transitionTo(R.States.active);
		graph.gamegraph_getCurrentPlayer().activeSyscall = null;
		
		// Ask our level to execute the following function
		var fadeFunction = function() {
			var alpha = Math.max(graph.gamegraph_getCurrentPlayer().alpha - 0.02, 0);
			graph.cascadePropertySet({alpha: alpha});
			if (alpha == 0) {
				if (this.objDataToLoad.length <= this.currentI+1)
					this.trigger(R.Event.Win);
				else
					this.gamelevel_toNextGraph(undefined, true);
			}
		};
		
		KernelPanic.currentLevel.onRegister[R.States.active] = function() {
			this.bind(R.Event.EnterFrame, fadeFunction);
		};
		KernelPanic.currentLevel.onUnregister[R.States.active] = function() {
			this.unbind(R.Event.EnterFrame, fadeFunction);
		};
		
	    // Time to set our level to action!
		KernelPanic.currentLevel.transitionTo(R.States.active);		
	},
});
