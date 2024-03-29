Crafty.c("GamePlayer", {
	_gameplayer_require: "GamePiece, Slider, Ellipse, StateMachine",
	gameplayer_graph: null,
	gameplayer_hud: null,
	
	otherSlideTarget: null,
	slideTarget: null,
	gameplayer_lastGraphY: 0,
	
	inMutexLockZone: null,
	inMutexUnlockZone: null,
	hasMutexPass: null,
	
	lastHitX: 0,
	lastHitY: 0,
	
	moveKey1: null,
	moveKey2: null,
	moveAngle1: 0,
	moveAngle2: 0,
	
	_enabledFill: "#FFFFFF",
	_disabledFill: "#888888",
	
	init: function() {
		this.bind("Remove", this._gameplayer_onRemove).requires(this._gameplayer_require)
		.attr({
			lineWidth: 5,
			onClose: "fill",
			fillStyle: this._enabledFill,
			w: 30,
			h: 30,
			activeSyscall: null,
			slideTarget: new Crafty.math.Vector2D(),
			otherSlideTarget: new Crafty.math.Vector2D()
		});
		this._gameplayer_register();
	},
	
	_gameplayer_onRemove: function() {
		delete this.gameplayer_graph;
		delete this.gameplayer_hud;
		delete this.slideTarget;
		delete this.otherSlideTarget;
		delete this.activeSyscall;
		delete this.inMutexLockZone;
		delete this.inMutexUnlockZone;
	},
	
	_gameplayer_register: function(oldState) {
		this.onRegister[R.States.move] = function(state, repressMessage) {
			this.bind(R.Event.sliderHit, this._gameplayer_sliderHit)
			.bind(R.Event.Moved, this._gameplayer_moved);
			this.multi_enableControl();
			
			if (this.moveKey1 && this.moveKey2) {
				uiConsole.setMoveLine("Move with " + this.moveKey1 + " and " + this.moveKey2);
			}
			
			// show our player's direction to move in
			this.gameplayer_hud.visible = true;
		};
		this.onUnregister[R.States.move] = function(state, data) {
			this.gameplayer_hud.visible = false;
			this.multi_stop();
			this.multi_disableControl();
			this.unbind(R.Event.sliderHit, this._gameplayer_sliderHit)
			.unbind(R.Event.Moved, this._gameplayer_moved);
		};
		
		this.onRegister[R.States.chooseDirection] = function(state, data) {
			var hud = this.gameplayer_hud;
			hud.visible = true;
			
			uiConsole.setMoveLine("Waiting for choice...");
			
			if (data) {
				D.vector.x = data.hitX;
				D.vector.y = data.hitY;	
				this.lastHitX = data.hitX;
				this.lastHitY = data.hitY;
				data.edgeSet = this.gameplayer_graph.graph_edgeSet(D.vector);

				console.log("loading data");
				hud.gamehud_clear();	
				hud.gamehud_load(data);
			}
			this.bind(R.Event.KeyDown, this._gameplayer_onHudChoice);
		};
		this.onUnregister[R.States.chooseDirection] = function(state, data) {
			this.gameplayer_hud.visible = false;
			this.unbind(R.Event.KeyDown, this._gameplayer_onHudChoice);
		};
		
		this.onRegister[this.DISABLED_STATE] = function() {
			this.fillStyle = this._disabledFill;
			this.unbind(R.Event.focused, this._gamegraph_focused);
			if (this.activeSyscall)
				this.activeSyscall.transitionTo(R.States.suspended);
		};
		this.onUnregister[this.DISABLED_STATE] = function() {
			this.fillStyle = this._enabledFill;
			this.bind(R.Event.focused, this._gamegraph_focused);
			if (this.activeSyscall)
				this.activeSyscall.transitionTo(R.States.focused);
		};
	},
	
	gameplayer_reset: function() {
		this.gameplayer_putOnPoint(this.startData.hitX, this.startData.hitY);
		this.transitionTo(this.startState, this.startData);	
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
		return this.setGameProperty("gameplayer_hud", hud);
	},
	
	gameplayer_putOnPoint: function(x, y) {
		this.gameplayer_putOnLine(x, y, [], x, y, []);
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
		.slide_setSpeedFunctions(this._gameplayer_speed, this._gameplayer_releaseSpeed, this._gameplayer_onOtherKeyPressed)
		.slide_applySettings();
	},
	
	_gameplayer_speed: function(time, speed, contributedSpeed, sharedData) {
		sharedData.lastSpeed = (sharedData.lastSpeed) ? Math.min(sharedData.lastSpeed + KernelPanic.settings.playerAcceleration, KernelPanic.settings.maxSpeed) : 0.5;
		return sharedData.lastSpeed;
	},
	
	_gameplayer_releaseSpeed: function(time, speed, contributedSpeed, sharedData) {
		sharedData.time += time;
		sharedData.lastSpeed = sharedData.lastSpeed && sharedData.lastSpeed >= 0.1
			? Math.min(sharedData.lastSpeed + KernelPanic.settings.playerAcceleration, KernelPanic.settings.maxSpeed)
			: NaN;
		return sharedData.lastSpeed;	
	},
	
	_gameplayer_onOtherKeyPressed: function(key, sharedData) {
		sharedData.lastSpeed = 0;	
	},
	
	/*_gameplayer_speed: function(time, speed, contributedSpeed, sharedData) {
		var startSpeed = sharedData.lastReleaseSpeed ? sharedData.lastReleaseSpeed : 0;
		return Math.min(time/50 + startSpeed, 10);
	},
	
	_gameplayer_releaseSpeed: function(time, speed, contributedSpeed, sharedData) {
		// The contributed speed is the dot product between the player's movement
		// and the direction of our key's desired movement.    
		speed = contributedSpeed < 0.1 ? NaN : contributedSpeed;
		sharedData.lastReleaseSpeed = speed ? speed : 0;
		return speed;	
	},*/
	
	_gameplayer_sliderHit: function(data) {
		var graph = this.gameplayer_graph;
		var playerHitData = {
			center: (this.activeSyscall) ? this.activeSyscall.syscallName : null,
			hitX: data.x,
			hitY: data.y
		};

		this.otherSlideTarget.x = data.otherX;
		this.otherSlideTarget.y = data.otherY;
		
		this.transitionTo(R.States.chooseDirection, playerHitData);
		graph.trigger(R.Event.sliderHit, data);
	},
	
	_gameplayer_moved: function() {
		if (this.currentState == R.States.move) {
			this.gameplayer_hud.visible = false;
			this.gameplayer_graph.trigger(R.Event.playerMovement);
		}
	},
	
	gameplayer_resetHud: function() {
		var hud = this.gameplayer_hud;
		hud.gamehud_clear();
		hud.gamehud_keyMap[this.moveKey1] = {direction: this.moveAngle1};
		hud.gamehud_keyMap[this.moveKey2] = {direction: this.moveAngle2};
	},
	
	_gameplayer_onHudChoice: function(e) {
		var key = R.CodeToKey[e.key];
		
		if (this.gameplayer_hud.gamehud_keyMap[key]) {
			var hud = this.gameplayer_hud;
			var end = hud.gamehud_keyMap[key].vertex;
			var start = hud.gamehud_startVertex;
			
			// Put on line, set keys for movement
			this.moveKey1 = key;
			this.moveAngle1 = hud.gamehud_keyMap[key].direction;
			this.moveKey2 = hud.gamehud_oppositeKey(key);
			this.moveAngle2 = this.moveAngle1.clone().negate();
			this.gameplayer_resetHud();
			
			this.gameplayer_putOnLine(start.x, start.y, this.moveKey2, end.x, end.y, this.moveKey1);
			this.transitionTo(R.States.move);
		} else if (this.activeSyscall && key == this.gameplayer_hud.gamehud_syscallKey) {
			this.activeSyscall.trigger(R.Event.syscallActivate, this.gameplayer_graph);
		}
	},
});