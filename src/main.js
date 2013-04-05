function main() {
	// Init everything
	//Crafty.init(500,500);
	Crafty.init();
	Crafty.background('rgb(50,50,50)');
	Crafty.canvas.init();
	Crafty.viewport.clampToEntities = false;
	
	// Create a UI div for use in our game.
	// It's just a regular div -- the innards can be set to equal whatever
	// HTML we want.
	KernelPanic.UI = document.createElement("div");
	Crafty.canvas._canvas.parentElement.appendChild(KernelPanic.UI);
	KernelPanic.UI.style.position = "absolute";
	KernelPanic.UI.style.left = "0px";
	KernelPanic.UI.style.top = "0px";
	KernelPanic.UI.style.display = "block";
	KernelPanic.UI.style.width = Crafty.canvas._canvas.width + "px";
	KernelPanic.UI.style.height = Crafty.canvas._canvas.height + "px";
	
	// Start 
	Crafty.scene(R.Scene.loading);
};

// Load the game by adding our start function
window.addEventListener('load', main);