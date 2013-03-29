// Global game variable
var GamOs = {
	
	// Definition of the game's tile map
	tileMap: {
		width: 24,
		height: 16,
		tile: {
			width: 16,
			height: 16
		}
	},
	
	// The total width of our screen
	width: function() {
		return this.tileMap.width * this.tileMap.tile.width;
	},
	
	// The total height of our screen
	height: function() {
		return this.tileMap.height * this.tileMap.tile.height;
	},
	
};

function main() {
	
	Crafty.init(500,500);
	Crafty.background('rgb(50,50,50)');
	Crafty.canvas.init();
	
	Crafty.scene(R.Scene.loading);
};

// Load the game by adding our start function
window.addEventListener('load', main);