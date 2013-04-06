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
			w: 35,
			h: 35,
		});
		
		this.drawFunctions.push(this._syscall_changeGradient);
		
		this.onRegister[this.DISABLED_STATE] = function() {
			this.unbind(R.States.playerMovement, this._syscall_checkForCollision);
		};
		this.onUnregister[this.DISABLED_STATE] = function() {
			this.bind(R.States.playerMovement, this._syscall_checkForCollision);
		};
		
		this.onRegister[R.States.syscallFocused] = function() {
			this._parent.trigger(R.Event.syscallFocused, {isFocused: true, syscall: this});
		};
		this.onUnregister[R.States.syscallFocused] = function() {
			this._parent.trigger(R.Event.syscallFocused, {isFocused: false, syscall: this});
		};

		this.startState = R.States.syscallNormal;
	},
	
	_syscall_checkForCollision: function(player) {
		if (Math.abs(player.x - this.x) < player.w/2+this.w/2
			&& Math.abs(player.y - this.y) < player.h/2+this.h/2) {
				// Did we collide?
				if (this.currentState == R.States.syscallNormal) 
					this.transitionTo(R.States.syscallFocused);
		} else {
			// No collision?  We might need to tra
			if (this.currentState == R.States.syscallFocused)
				this.transitionTo(R.States.syscallNormal);
		}
	},
	
	_syscall_changeGradient: function() {
		if (this.currentState == R.States.syscallFocused
			|| (this.currentState == this.DISABLED_STATE && this.lastState == R.States.syscallFocused)) {
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
		// Graph, we don't want any input from you.  Shut up for a bit.
		graph.transitionTo(R.States.syscallActive);
		graph._activeSyscall = null;
		
		// We're going to create another player up at the top of the graph, back at start.
		// We'll then get the graph to scroll back up to the top.  Then, we'll
		// get rid of the old player.
		var exec = this;
		var oldPlayer = graph.gamegraph_gameplayer;
		var newPlayer = KernelPanic.currentLevel.gamelevel_createPlayer(graph);
		newPlayer.enableDrawing();
		
		// Keep the old player attached to the graph
		graph.attach(oldPlayer);
		
		// Communicate our behavior to the current level to scroll back to y = 0!
		// And we sort of do this by hijacking its state machine.  Totally legit!
		var seekFunction = function() {
			if (this.seekVehicle.seek())
				this.transitionTo(R.States.levelNormal);
		};
		
		KernelPanic.currentLevel.onRegister[R.States.syscallActive] = function() {
			// Remember, the context this is called in is the level.
			this.seekVehicle.setSeek(graph, {x: graph.x, y: 0});
			this.bind('EnterFrame', seekFunction);
		};
		KernelPanic.currentLevel.onUnregister[R.States.syscallActive] = function() {
			this.unbind('EnterFrame', seekFunction);
			
			// Exec, stop freaking out, you're no longer active.
			// In fact, we're getting rid of you
			exec.transitionTo(R.States.syscallNormal);
			delete graph.gamegraph_syscalls[exec.syscallId];
			exec.destroy();
			
			// Kill the old player.
			graph.detach(oldPlayer);
			oldPlayer.destroy();
			
			var start = graph.graph_labelSet('start');
			graph.transitionTo(R.States.chooseDirection, { hitX: start.x1, hitY: start.y1 });
		};
		
		// Time to set our level to action!
		KernelPanic.currentLevel.transitionTo(R.States.syscallActive);
	},
});

Crafty.c('Fork', {
	init: function() {
		this.requires('Syscall')
		.attr({
			steadyStyle: "#FF0000",
			syscallName: 'Fork'
		});
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
	// TODO decrease visibility of entire graph
	_vanish_activate: function(graph) {	
		// Graph, we don't want any input from you
		graph.transitionTo(R.States.syscallActive);
		graph._activeSyscall = null;
		
		// Ask our level to execute the following function
		var fadeFunction = function() {
			var alpha = Math.max(graph.gamegraph_gameplayer.alpha - 0.02, 0);
			graph.cascadePropertySet({alpha: alpha});
			if (alpha == 0)
				this.gamelevel_toNextGraph();
		};
		
		KernelPanic.currentLevel.onRegister[R.States.syscallActive] = function() {
			this.bind('EnterFrame', fadeFunction);
		};
		KernelPanic.currentLevel.onUnregister[R.States.syscallActive] = function() {
			this.unbind('EnterFrame', fadeFunction);
		};

		this._vanish_graph = graph;
		this._vanish_oldI = KernelPanic.currentLevel.currentI;
		this.bind(R.Event.levelGraphSwitched, this._vanish_removeGraph);
		
	    // Time to set our level to action!
		KernelPanic.currentLevel.transitionTo(R.States.syscallActive);		
	},
	
	_vanish_removeGraph: function() {
		KernelPanic.currentLevel.graphs.splice(this._vanish_oldI, 1);
		--KernelPanic.currentLevel.currentI;
		
		this.unbind(R.Event.levelGraphSwitched, this._vanish_removeGraph);
		this._vanish_graph.destroy();		
	}
});
