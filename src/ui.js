var ui = {
	setInputKeys: function() {
		var tempElement = document.getElementById("activateSyscallKey");
		if (tempElement)
    		tempElement.innerHTML = KernelPanic.settings.activateSyscallKey;
    	
    	tempElement = document.getElementById("contextSwitchKey");
    	if (tempElement)
    		tempElement.innerHTML = KernelPanic.settings.contextSwitchKey;
	}
}

var uiConsole = {
	console: null,
	moveConsole: null,
	edgeConsole: null,
	
	init: function() {
		uiConsole.console = document.getElementById("console");
		uiConsole.moveConsole = document.getElementById("moveConsole");
		uiConsole.edgeConsole = document.getElementById("edgeConsole");
		uiConsole.scrollToBottom();
	},
	
	scrollToBottom: function() {
		uiConsole.console.scrollTop = uiConsole.console.scrollHeight;
		uiConsole.moveConsole.scrollTop = uiConsole.moveConsole.scrollHeight;	
		uiConsole.edgeConsole.scrollTop = uiConsole.edgeConsole.scrollHeight;	
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
	},
	
	setMoveLine: function(newText) {
		uiConsole.moveConsole.innerHTML = "$ " + newText;
		uiConsole.scrollToBottom();
		console.log("Added " + newText);
	},
	
	setEdgeLine: function(newText) {
		uiConsole.edgeConsole.innerHTML = "$ " + newText;
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
