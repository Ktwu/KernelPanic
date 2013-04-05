Crafty.scene(R.Scene.game, function() {
	KernelPanic.UI.innerHTML = "";
	KernelPanic.currentLevel = Crafty.e('GameLevel').load([testLevel, level1, level2]);
});

Crafty.scene(R.Scene.intro, function() {
	console.log(Crafty.assets);
	KernelPanic.UI.innerHTML = Crafty.assets['assets/ui/intro.html'];
	
	var fun = function(e) {
		if (e.key == Crafty.keys.SPACE) {
			this.unbind('KeyDown', fun);
			Crafty.scene(R.Scene.game);
		}
	};
	
	this.bind('KeyDown', fun);
});

// Loading scene
// Handles the loading of binary assets such as images and audio files
Crafty.scene(R.Scene.loading, function() {
	// Simple loading screen
	Crafty.e('2D, DOM, Text').text('Loading...').attr({
		x : 0,
		y : Crafty.canvas._canvas.height / 2 - 24,
		w : Crafty.canvas._canvas.width
	}).css(R.CSS.$text);
	
	// First check whether all of our requirements are met
	if (!Crafty.support.canvas) {
		D.error = R.Error.noCanvas;
		Crafty.scene(R.Scene.error);
		
	} else {
		// Code to load UI files.
		Crafty.load(['assets/ui/intro.html', 'assets/ui/intro2.html'], function() { Crafty.scene(R.Scene.intro); });
	}
}); 


// Error scene
// If the browser doesn't support something we need, go here.
Crafty.scene(R.Scene.error, function() {
	// Simple loading screen
	Crafty.e('2D, DOM, Text').text(D.error).attr({
		x : 0,
		y : GamOs.height() / 2 - 24,
		w : GamOs.width()
	}).css(R.CSS.$text);

	// Load our images and audio here with Crafty.load
	// Then add our audio to Crafty.  Use mp3, ogg, and aac formats.

	// Start the game
	Crafty.scene('Game');
}); 