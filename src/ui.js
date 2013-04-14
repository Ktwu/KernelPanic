var uiConsole = {
	console: null,
	
	init: function() {
		uiConsole.console = document.getElementById("console");
		uiConsole.scrollToBottom();
	},
	
	scrollToBottom: function() {
		var c = uiConsole.console;
		c.scrollTop = c.scrollHeight;		
	},
	
	addHTML: function(newText) {
		uiConsole.console.innerHTML += newText;
		uiConsole.scrollToBottom();
		console.log("Added " + newText);	
	},
	
	addLine: function(newText) {
		uiConsole.console.innerHTML += "<p class='console'>$ " + newText + "</p>";
		uiConsole.scrollToBottom();
		console.log("Added " + newText);
	}
};

var uiButton = {
	onClickStart: function() {
		Crafty.scene(R.Scene.game);
	},
	
	onClickSettings: function() {
		console.log("Settings don't exist yet :(");
	}
};
