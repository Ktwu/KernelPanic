// A store for global game objects
var KernelPanic = null;

// A store for unchanging variables for reference throughout the game
// Similar to Android's reference files
var R = {
	
	States: {
		none: 			 -1,
		move: 			 -2,
		chooseDirection: -3,
		graphChange:     -4,
		playerMovement:  -5,
		
		syscallNormal:   -6,
		syscallFocused:  -7,
		syscallActive:   -8,
		
		levelNormal:     -9
	},
	
	Scene: {
		loading:  	'Loading',
		error:    	'Error',
		game:     	'Game',
		intro:    	'Intro',
		controls: 	'Controls'
	},
	
	Event: {
		sliderHit: 'SliderHit',
		chooseDirection: 'ChooseDirection',
		syscallFocused: 'SyscallFocused',
		syscallActivate: 'SyscallActivate',
		levelGraphSwitched: 'LevelGraphSwitched'
	},
	
	Error: {
		noCanvas: 'Canvas tag not supported :(',
		noAudio:  'Audio not supported :('
	},
	
	CSS: {
		$text: {
		  'font-size': '24px',
		  'font-family': 'Arial',
		  'color': 'white',
		  'text-align': 'center'
		},
		
		$strokeStyle: '#FFFFFF'
	},
	
	Vector: {
		right: new Crafty.math.Vector2D(1,0)
	},
	
	CodeToKey: {}
};

for (var key in Crafty.keys) {
	R.CodeToKey[Crafty.keys[key]] = key;
}

// A store for temporary data, such as messages between scenes.
var D = {
	scene: null,
	error: null,
	css:   null,
	vector: new Crafty.math.Vector2D()
};

// An adjacency list, where strokes[i] are edge lists, stroke[i][j] are vertices
var testLevel = {
	list: [
	  [ [150,0], [150,100] ],
	  [ [150,100], [100,200], [150,400], [200,200] ],
	  [ [100,200], [150,400] ],
	  [ [200,200], [200,400] ],
	  [ [150,400], [100,600] ],
	  [ [200,400], [150,600] ],
	  [ [100,600], [100,900] ]
	],
	
	vertexBase: [25,-200],
	
	labels: {
		start: {x1:150,y1:0, x2:150,y2:100}
	},
	
	syscalls: {
		Vanish: [ [100,900] ],
		Exec: [ [150,600] ]
	},
	
	strokeStyle: '#FFFFFF',
	lineWidth: 3
};

var level1 = {
	list: [
	  [ [150,0], [150,100] ],
	  [ [150,100], [50,200], [150,200], [250,200] ],
	  [ [50,200], [150,400], [150,200] ],
	  [ [150,200], [150,400] ],
	  [ [250,200], [150,400], [150,200] ],
	  [ [150,400], [50,600], [150,600], [250,600] ],
	  [ [50,600], [150,900], [150,600] ],
	  [ [150,600], [150,900] ],
	  [ [250,600], [150,900], [150,600]],
	  [ [150,900], [25,1100] ],
	  [ [25,1100], [275,1300] ],
	  [ [275,1300], [150,1500] ],
	  [ [150,1500], [75,1600], [150,1700], [225,1600] ]
	],
	
	vertexBase: [25,-200],
	labels: {
		start: {x1:150,y1:0, x2:150,y2:100}
	},
	
	syscalls: {
		Vanish: [ [150,1700] ],
		Exec: [ [150,600], [75, 1600], [150,1500] ]
	},
	
	strokeStyle: '#FFFFFF',
	lineWidth: 3
};

var level2 = {
	list: [
	  [ [150,0], [150,100] ],
	  [ [150,100], [50,200] ],
	  [ [50,200], [150,400] ],
	  [ [150,200], [150,400] ],
	  [ [250,200], [150,400], [150,200] ],
	  [ [150,400], [50,600] ],
	  [ [50,600], [150,900], [150,600] ],
	  [ [150,600], [150,900] ],
	  [ [250,600], [150,900], [150,600]],
	  [ [150,900], [25,1100] ],
	  [ [25,1100], [275,1300] ],
	  [ [275,1300], [150,1500] ],
	],
	
	vertexBase: [25,-200],
	labels: {
		start: {x1:150,y1:0, x2:150,y2:100}
	},
	
	syscalls: {
		Fork: [ [150,200] ],
		Exec: [ [250, 200], [50, 600], [150,1500] ]
	},
	
	strokeStyle: '#FFFFFF',
	lineWidth: 3
};

