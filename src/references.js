// A store for global game objects
var Game = {
	KernelPanic: null,
	player: null,
	graph: null,
	hud: null
};

// A store for unchanging variables for reference throughout the game
// Similar to Android's reference files
var R = {
	Scene: {
		loading: 'Loading',
		error:   'Error',
		game:    'Game'
	},
	
	Event: {
		sliderHit: 'SliderHit',
		chooseDirection: 'ChooseDirection'
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
	  [ [150,100], [100,200], [150,200], [200,200] ],
	  [ [100,200], [150,400] ],
	  [ [150,200], [150,400] ],
	  [ [200,200], [200,400] ],
	  [ [150,400], [100,600] ],
	  [ [200,400], [150,600] ],
	  [ [100,600], [100,900] ]
	],
	
	labels: {
		start: {x1:150,y1:0, x2:150,y2:100}
	},
	
	strokeStyle: '#FFFFFF',
	lineWidth: 3
};

