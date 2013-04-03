Crafty.c('Syscall', {
	blinkStyle: '#FFFF00',
	steadyStyle: '#FF0000',
	syscallId: -1,
	
	_percent: 0,

	init: function() {
		this.requires('GamePiece, Ellipse, StateMachine')
		.attr({
			lineWidth: 2,
			fillStyle: "#0000FF",
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
			//console.log(syscall)
			this._parent.trigger(R.Event.syscallFocused, {isFocused: true, syscall: this});
		};
		this.onUnregister[R.States.syscallFocused] = function() {
			this._parent.trigger(R.Event.syscallFocused, {isFocused: false, syscall: this});
		};

		this.lastState = R.States.syscallNormal;
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
		this.requires('Syscall');
		
		/*this.onRegister[R.States.syscallFocused] = function() {
			// When activated, the player should start back at the beginning of the map.
			// The player should be replaced by another player that's at the top of the map.
			// Automatic activation?  Or activate on s?
		};		
		this.onUnregister[R.States.syscallFocused] = function() {
		};*/
	}
});

Crafty.c('Fork', {
	init: function() {
		this.requires('Syscall')
		.attr({
			steadyStyle: "#FF0000"
		});
		
		/*this.onRegister[R.States.syscallFocused] = function() {
		};		
		this.onUnregister[R.States.syscallFocused] = function() {
		};*/
	}
});
