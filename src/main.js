function main() {
	// Init everything
	Crafty.init(500,500);
	Crafty.background('rgb(50,50,50)');
	Crafty.canvas.init();
	
	// Define our KernelPanic game reference
	// that our game logic will reference for game state.
	KernelPanic = Crafty.e('KernelPanic');
	
	// Start 
	Crafty.scene(R.Scene.loading);
};

// Load the game by adding our start function
window.addEventListener('load', main);