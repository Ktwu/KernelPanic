var uiConsole = {
	console: null,
	
	init: function() {
		uiConsole.console = document.getElementById("console");
	},
	
	scrollToBottom: function() {
		var c = uiConsole.console;
		c.scrollTop = c.scrollHeight;		
	},
	
	addLine: function(newText) {
		uiConsole.console.innerHTML += "<p class='console'>$ " + newText + "</p>";
		uiConsole.scrollToBottom();
		console.log("Added " + newText);
	}
};
