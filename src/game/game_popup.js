Crafty.c("GamePopup", {
	init: function() {
		this.requires("HTML, Center, StateMachine")
		.attr({
			x: 0,
			y: 100,
			w: Crafty.viewport.width/2,
			h: Crafty.viewport.height * 3/4,
			z: -2
		})
		
		this.onRegister[R.States.normal] = function() {
			this.bind(R.Event.KeyUp, this._popup_onKeyUp);
			uiConsole.setMoveLine("SPACE to continue");
			uiConsole.setEdgeLine("no edges");
		}
		this.onUnregister[R.States.normal] = function() {
			this.unbind(R.Event.KeyUp, this._popup_onKeyUp);
		}
		
		this.startState = R.States.normal;
	},
	
	popup_load: function(objData) {
		this.replace(objData);
		ui.setInputKeys();
		return this;
	},
	
	getDefinedCenterX: function() {
		return this.centerX();
	},
	
	_popup_onKeyUp: function(e) {
		if (this.currentState == R.States.normal && e.key == Crafty.keys.SPACE) {
			this.transitionTo(R.States.active);
			KernelPanic.currentLevel.gamelevel_toNextGraph(undefined, true);
			
			var data = document.getElementById("toConsoleData");
			uiConsole.addHTML(data.innerHTML);
		}
	},
	
	enableDrawing: function() {	
	},
	
	disableDrawing: function() {	
	},
});