Crafty.c('Syscall', {
	blinkStyle: '#FFFF00',
	steadyStyle: '#FF0000',
	_percent: 0,
	
	States: {
		normal:  -1,
		focused: -2,
		none:    -3
	},
	
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
		
		this.onRegister[this.States.none] = function(e) {
			this.unbind(R.States.playerMovement, this._syscall_checkForCollision);
		};
		this.onUnregister[this.States.none] = function() {
			this.bind(R.States.playerMovement, this._syscall_checkForCollision);
		};

		this.bind(R.States.playerMovement, this._syscall_checkForCollision);
		this.setCurrentState(this.States.normal);
	},
	
	disableState: function() {
		this.transitionTo(this.States.none);
	},
	
	enableState: function() {
		this.transitionTo(this.lastState);
	},
	
	_syscall_checkForCollision: function(player) {
		if (Math.abs(player.x - this.x) < player.w/2+this.w/2
			&& Math.abs(player.y - this.y) < player.h/2+this.h/2) {
				// Did we collide?
				if (this.currentState == this.States.normal) 
					this.transitionTo(this.States.focused);
		} else {
			// No collision?  We might need to tra
			if (this.currentState == this.States.focused)
				this.transitionTo(this.States.normal);
		}
	},
	
	_syscall_changeGradient: function() {
		if (this.currentState == this.States.focused
			|| (this.currentState == this.States.none && this.lastState == this.States.focused)) {
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
		
		this.onRegister[this.States.focused] = function() {
		};		
		this.onUnregister[this.States.focused] = function() {
		};
	}
});

Crafty.c('Fork', {
	init: function() {
		this.requires('Syscall')
		.attr({
			steadyStyle: "#FF0000"
		});
		
		this.onRegister[this.States.focused] = function() {
		};		
		this.onUnregister[this.States.focused] = function() {
		};
	}
});
