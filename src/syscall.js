Crafty.c('Syscall', {
	init: function() {
		this.requires('GamePiece, Ellipse')
		.attr({
			lineWidth: 10,
			fillStyle: "#0000FF",
			onClose: 'fill',
			w: 30,
			h: 30,
		});
	}
	
	// Something on collisions.  Launch some event when the main player hits us.
})

Crafty.c('Exec', {
	init: function() {
		this.requires('Syscall');
	}
});

Crafty.c('Fork', {
	init: function() {
		this.requires('Syscall')
		.attr({
			fillStyle: "#FF0000"
		});
	}
});
