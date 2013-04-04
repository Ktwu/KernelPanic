Crafty.scene(R.Scene.game, function() {
	
	// We'll create a game level which will contain all of the setup logic.
	// Each level can take in an array of graphs to load.
	// The player is placed on each graph.  Each graph also keeps track of the last place the player was on.
	KernelPanic.currentLevel = Crafty.e('GameLevel').load([testLevel, level1, level2]);
	//Crafty.viewport.follow(LEVEL.graphs[0].gamegraph_gameplayer);
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
	
		// Load our images and audio here with Crafty.load
		// Then add our audio to Crafty.  Use mp3, ogg, and aac formats.
	
		// Start the game
		Crafty.scene(R.Scene.game);
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