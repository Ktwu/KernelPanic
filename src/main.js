function main() {
	Crafty.init(500,500);
	Crafty.background('rgb(50,50,50)');
	Crafty.canvas.init();
	
	Crafty.scene(R.Scene.loading);
};

// Load the game by adding our start function
window.addEventListener('load', main);