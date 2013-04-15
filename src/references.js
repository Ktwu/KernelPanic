// A store for global game objects
var KernelPanic = {
	currentLevel: null,
	UI: null,
	settings: {
		isTutorialActive: true,
		scaleX: 1,
		scaleY: 1,
		
		keyList: ["D", "C", "X", "Z", "A", "Q", "W", "E"],
		angleList: [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4],

		//keyList: ["D", "S", "A", "W"],
		//angleList: [0, Math.PI/2, Math.PI, 3*Math.PI/2],
		
		contextSwitchKey: "K",
		activateSyscallKey: "SPACE",
				
		getGraphCenterOnX: function() {
			// Graphs appears such that their center point is 2/3rds of the screen width
			return Crafty.canvas._canvas.width * 2/3;
		}
	}
};

// A store for unchanging variables for reference throughout the game
// Similar to Android"s reference files
var R = {
	Images: {
		fork:				"assets/images/fork.png",
		exec:				"assets/images/exec.png",
		vanish:				"assets/images/vanish.png"
	},
		
	UI: {
		intro:				"intro.html",  
		prototype_intro: 	"prototype_intro.html",
		console:			"console.html",
		
		popup_move:			"popup_move.html",
		popup_scroll:		"popup_scroll.html",
		popup_exec:			"popup_exec.html",
		popup_mutex:		"popup_mutex.html",
		popup_fork:			"popup_fork.html"
	},
	
	States: {
		none: 			 -1,
		move: 			 -2,
		chooseDirection: -3,
		graphChange:     -4,
		playerMovement:  -5,
		
		normal:   -6,
		focused:  -7,
		active:   -8,
		
		levelNormal:     -9,
		playerChange:    -10,
		
		suspended:       -11,
		dead:            -12,
	},
	
	Scene: {
		loading:  				"Loading",
		error:			    	"Error",
		game:     				"Game",
		prototype_intro:    	"Prototype_Intro",
		controls: 				"Controls",
		editor:					"Editor"
	},
	
	Event: {
		sliderHit: 				"SliderHit",
		chooseDirection: 		"ChooseDirection",
		syscallFocused: 		"SyscallFocused",
		syscallActivate: 		"SyscallActivate",
		levelGraphSwitched: 	"LevelGraphSwitched",
		playerMovement:         "PlayerMovement",
		
		Change: "Change",
		Remove: "Remove",
		KeyDown: "KeyDown",
		KeyUp: "KeyUp",
		EnterFrame: "EnterFrame",
		Moved: "Moved",
		
		Win: "Win",
		Lose: "Lose"
	},
	
	Error: {
		noCanvas: "Canvas tag not supported :(",
		noAudio:  "Audio not supported :(",
		loadFail: "Unable to load all assets :("
	},
	
	CSS: {
		$text: {
		  "font-size": "24px",
		  "font-family": "Arial",
		  "color": "white",
		  "text-align": "center"
		},
		
		$strokeStyle: "#FFFFFF"
	},
	
	Vector: {
		right: new Crafty.math.Vector2D(1,0)
	},
	
	CodeToKey: {},
	
	UiConsoleMessages: {
		FORK:   "Activated FORK syscall.  A new player has been made for you to control.",
		EXEC:   "Activated EXEC syscall.  You've been reset to the program's start.",
		VANISH: "program terminated",
		MUTEX_HIT_UNLOCK: "Unlocking mutex (O).  Entering critical area...",
		MUTEX_HIT_LOCK:   "The mutex is locked (X).  You will have to release it first."
	}
};

for (var key in Crafty.keys) {
	R.CodeToKey[Crafty.keys[key]] = key;
}

// A store for temporary data, such as messages between scenes.
var D = {
	scene: null,
	error: null,
	css:   null,
	vector: new Crafty.math.Vector2D(),
	vector2: new Crafty.math.Vector2D()
};