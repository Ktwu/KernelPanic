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
		var uis = [];
		for (var i in R.UI)
			uis.push(R.UI[i]);
			
		Crafty.load(uis,
			function() { Crafty.scene(R.Scene.prototype_intro); },
			null,
			function() { D.error = R.Error.loadFail; Crafty.scene(R.Scene.error); }
		);
	}
}); 

Crafty.scene(R.Scene.game, function() {
	KernelPanic.UI.innerHTML = Crafty.assets[R.UI.console];
	uiConsole.init();
	
	KernelPanic.currentLevel = Crafty.e('GameLevel')
		.attr({
			objDataToLoad: [
				R.UI.popup_move, level1, 
				R.UI.popup_scroll, level2,
				R.UI.popup_exec, level3,
				level4,
				level5,
				R.UI.popup_mutex,
				level6,
				R.UI.popup_fork, level7
			]
		})
		.enableMachine(R.States.graphChange, 0);
});

Crafty.scene(R.Scene.intro, function() {
	console.log(Crafty.assets);
	KernelPanic.UI.innerHTML = Crafty.assets[R.UI.intro];
	
	var fun = function(e) {
		if (e.key == Crafty.keys.SPACE) {
			this.unbind('KeyDown', fun);
			Crafty.scene(R.Scene.game);
		}
	};
	this.bind('KeyDown', fun);
});

Crafty.scene(R.Scene.prototype_intro, function() {
	KernelPanic.UI.innerHTML = Crafty.assets[R.UI.prototype_intro];
	KernelPanic.UI.style['overflow-y'] = 'auto';
	
	var fun = function(e) {
		if (e.key == Crafty.keys.SPACE) {
			this.unbind('KeyDown', fun);
			Crafty.scene(R.Scene.game);
		}
	};
	this.bind('KeyDown', fun);
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
}); 


Crafty.scene(R.Scene.editor, function() {
	var editor = Crafty.e("KernelPanicEditor");
});