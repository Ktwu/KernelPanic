Crafty.scene(R.Scene.game, function() {
 
	/*
		Determine which path we need to load
		
		Load it and instantiate the player at the path's beginning
		For now, we'll use an adjacency list to represent levels (yaaaay json)
		
		for each frame...
			scroll the path
			if the player falls off the top, game over
			
		TWO DIFFERENT INPUTS	
		the player may move on the path in between the two lines
		style of movement is uncertain at the moment
		
		at each junction, the player is given a choice about which path it
		may traverse
		
		depending on which key the player presses, they move onto the appropriate path
	
	*/
	
	Game.KernelPanic = Crafty.e('KernelPanic'); 
	
	var graph = Crafty.e('GameGraph')
		.gamegraph_load(testLevel)
		.graph_makeUndirected()
		.attr({lineWidth: 10})
		.centerOnX(Crafty.canvas._canvas.width/2);
		
	var player = Crafty.e('Player, Ellipse')
		.attr({lineWidth: 5, onClose: 'fill', fillStyle: "#FFFFFF", w: 30, h: 30, graph: graph});
	
	var hud = Crafty.e('GameHud')
		.attr({lineWidth: 20, strokeStyle: "#000000", onClose: 'stroke', w: 100, h: 100, visible: false, gameHud_displacement: 40})
		.centerOn(player.centerX(), player.centerY());
		
	player.attach(hud);
	graph.attach(player);
	
	Game.graph = graph;
	Game.player = player;
	Game.hud = hud;
	
	// After we draw the graph, we want to draw the line that the player is on.
	// Add it as an after-effect.
	graph.afterDrawFunctions.push(
		function(data) {
			var ctx = data.ctx;
		
			ctx.lineWidth = Game.graph.lineWidth;
			ctx.strokeStyle = "#00FF00";
			ctx.beginPath();
		
			var absPos = Game.graph.gamegraph_vertexBase();
			ctx.moveTo(Game.player.x1 + absPos._x, Game.player.y1 + absPos._y);
			ctx.lineTo(Game.player.x2 + absPos._x, Game.player.y2 + absPos._y);
		   	
		    ctx.closePath();
		    ctx.stroke();
		}
	);
		
	var start = graph.graph_labelSet('start');
	player.player_putOnLine(
		start.x1, start.y1,
		start.x2, start.y2);
		
	console.log(Crafty.canvas);	
});

// Loading scene
// Handles the loading of binary assets such as images and audio files
Crafty.scene(R.Scene.loading, function() {
	// Simple loading screen
	/*Crafty.e('2D, DOM, Text').text('Loading...').attr({
		x : 0,
		y : GamOs.height() / 2 - 24,
		w : GamOs.width()
	}).css(R.CSS.$text);*/
	
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