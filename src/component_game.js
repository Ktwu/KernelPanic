Crafty.c('Player', {
	graph: null,
	_tmp_vector: new Crafty.math.Vector2D(),
	
	init: function() {
		this.requires('BeforeDraw, Slider, AfterDraw')
		.bind(R.Event.sliderHit, this._player_sliderHit);
	},
	
	player_putOnLine: function(x1, y1, x2, y2) {	
		this.slide_setPoint1(x1, y1, ['LEFT_ARROW'])
		.slide_setPoint2(x2, y2, ['RIGHT_ARROW']);
		
		var absPos = this.graph.gamegraph_vertexBase();
		x1 += absPos._x;
		y1 += absPos._y;

		this.centerOn(x1,y1)
		.slide_anchor(0)
		.slide_setSpeedFunctions(this._player_speed, this._player_releaseSpeed)
		.slide_applySettings();
	},
	
	_player_speed: function(time, speed) {
		return Math.min(time/100, 10);
	},
	
	_player_releaseSpeed: function(time, releaseSpeed, speed) {
		speed -= 0.5;  return speed < 1 ? NaN : speed;
	},
	
	_player_sliderHit: function(data) {
		// Ferry the data from us to our game logic.
		Game.KernelPanic.trigger(R.Event.sliderHit, data);
	},
});

Crafty.c('GameGraph', {
	_gamegraph_travelgraph: null,
	
	init: function() {
		this.requires('BeforeDraw, Graph, GraphDraw, AfterDraw');
		this._gamegraph_travelgraph = Crafty.e('GraphDraw');
		
		this._gamegraph_travelgraph.attr({
			strokeStyle: "#0000FF", 
			lineWidth: 5
		});
		this.attach(this._gamegraph_travelgraph);
	},
	
	gamegraph_load: function(graph) {
		var list = graph.list;
		var v1, v2;
		for (var i = 0; i < list.length; ++i) {
			v1 = new Crafty.math.Vector2D(list[i][0][0], list[i][0][1]);
			for (var j = 1; j < list[i].length; ++j) {
				v2 = new Crafty.math.Vector2D(list[i][j][0], list[i][j][1]);
				this.graph_unsafeAddEdge(v1, v2);
				this.graphdraw_tryAddEdge(v1, v2);
			}
		}
		
		var labels = graph.labels;
		if (labels)
			for (var label in labels) {
				this.graph_addLabel(label, labels[label]);
		}
		
		return this;
	},
	
	gamegraph_addTraveledEdge: function(v1, v2) {
		this._gamegraph_travelgraph.graphdraw_tryAddEdge(v1, v2);
	},
	
	gamegraph_vertexBase: function() {
		return this.graphdraw_vertexBase();
	}
});


Crafty.c('GameHud', {
	gameHud_startVertex: null,
	gameHud_keyMap: null,
	gameHud_displacement: 20,
	_gameHud_keyList: ['D', 'C', 'X', 'Z', 'A', 'Q', 'W', 'E'],
	_gameHud_angleList: [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4],
	
	init: function() {
		this.requires('Ellipse')
		.bind('Draw', this._gameHud_draw);
		this.gameHud_keyMap = {};
	},
	
	gameHud_clear: function() {
		this.gameHud_keyMap = {};
	},
	
	gameHud_load: function(edgeset) {
		this.gameHud_startVertex = edgeset.startVertex;
		var ends = edgeset.endVertices;
		var angle;
		var angles = [];
		for (var i = 0; i < ends.length; ++i) {
			D.vector.x = ends[i].x;
			D.vector.y = ends[i].y;
			D.vector = D.vector.subtract(edgeset.startVertex).normalize();
			
			angle = R.Vector.right.angleBetween(D.vector);
			if (angle < 0)
				angle += 2*Math.PI;
			angles.push(angle);
		}
		
		// For each angle, find its closest value.
		// For the closest value, find out if someone is closer to it, and if so, repeat.
		// For each matching, remove the matched values from their lists and repeat.
		// Expensive for lots of things, but not for small things!
		var angleBlacklist = [];
		var keyAngleBlacklist = [];
		var i = 0;
		while (angleBlacklist.length < angles.length
			&& keyAngleBlacklist.length < this._gameHud_keyList.length) {
				
			// Find the closest key-angle to our angle, then verify that there's no other
			// key-angle that's closer
			var keyData = Tools.toClosest(angles[i], this._gameHud_angleList, keyAngleBlacklist);
			var angleData = Tools.toClosest(keyData.value, angles, angleBlacklist);
			
			if (angleData.value == angles[i]) {
				// Excellent, a matching!
				this.gameHud_keyMap[this._gameHud_keyList[keyData.i]] = {
					direction: new Crafty.math.Vector2D(Math.cos(angles[i]), Math.sin(angles[i])),
					vertex: ends[i]
				};
				
				angleBlacklist.push(angleData.value);
				keyAngleBlacklist.push(keyData.value);
			} else {
				// If some other angle is closer to our key, then let's find out
				// who this new key should match to first.
				i = angleData.i;
			}
		}
	},
	
	_gameHud_draw: function(data) {
		var ctx = data.ctx;
		
		ctx.save();
		ctx.fillStyle = "#FF0000";
		ctx.font = "bold 12px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		for (var key in this.gameHud_keyMap) {
			ctx.fillText(key, 
				(this.gameHud_displacement * this.gameHud_keyMap[key].direction.x + this.centerX()),
				(this.gameHud_displacement * this.gameHud_keyMap[key].direction.y + this.centerY()));
		}
		
		ctx.restore();
	}
});