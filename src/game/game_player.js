Crafty.c("GamePlayer", {
	_gameplayer_require: "GamePiece, Slider, Ellipse, StateMachine",
	gameplayer_graph: null,
	gameplayer_hud: null,
	gameplayer_slideTarget: null,
	gameplayer_lastGraphY: 0,
	
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
		});
			
		this.slideTarget = new Crafty.math.Vector2D();	
		this._gameplayer_register();
	},
	
	_gameplayer_onRemove: function() {
		delete this.gameplayer_graph;
		delete this.gameplayer_hud;
		delete this.gameplayer_slideTarget;
		delete this.activeSyscall;
	},
	
	_gameplayer_register: function() {
		this.onRegister[R.States.move] = function(state, data) {
			this.bind(R.Event.sliderHit, this._gameplayer_sliderHit)
			.bind(R.Event.Moved, this._gameplayer_moved);
			this.multi_enableControl();
		};
		this.onUnregister[R.States.move] = function(state, data) {
			this.multi_disableControl();
			this.unbind(R.Event.sliderHit, this._gameplayer_sliderHit)
			.unbind(R.Event.Moved, this._gameplayer_moved);
		};
		
		this.onRegister[R.States.chooseDirection] = function(state, data) {
			var hud = this.gameplayer_hud;
			hud.visible = true;
			
			if (data) {
				D.vector.x = data.hitX;
				D.vector.y = data.hitY;	
				data.edgeSet = this.gameplayer_graph.graph_edgeSet(D.vector);

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
		var graph = this.gameplayer_graph;
		graph.trigger(R.Event.sliderHit, data);

		var data = {
			center: (this.activeSyscall) ? this.activeSyscall.syscallName : null,
			hitX: data.x,
			hitY: data.y
		};

		this.transitionTo(R.States.chooseDirection, data);	
	},
	
	_gameplayer_moved: function() {
		this.gameplayer_graph.trigger(R.Event.playerMovement);
	},
	
	_gameplayer_onHudChoice: function(e) {
		var key = R.CodeToKey[e.key];
		if (this.gameplayer_hud.gamehud_keyMap[key]) {
			var end = this.gameplayer_hud.gamehud_keyMap[key].vertex;
			var start = this.gameplayer_hud.gamehud_startVertex;

			// Put on line, set keys for movement
			this.gameplayer_putOnLine(start.x, start.y, this.gameplayer_hud.gamehud_oppositeKey(key),
				end.x, end.y, key);
			this.transitionTo(R.States.move);
		} else if (this.activeSyscall && key == this.gameplayer_hud.gamehud_syscallKey) {
			this.activeSyscall.trigger(R.Event.syscallActivate, this.gameplayer_graph);
		}
	},
});