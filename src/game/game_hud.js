Crafty.c("GameHud", {
	gamehud_startVertex: null,
	gamehud_keyMap: null,
	gamehud_displacement: 20,
	gamehud_syscallName: "",
	gamehud_syscallKey: "SPACE",
	_gamehud_require: "GamePiece, Ellipse",
	
	init: function() {
		this.bind("Remove", this._gamehud_onRemove).requires(this._gamehud_require)
		.attr({
			lineWidth: 20,
			strokeStyle: "#000000",
			onClose: "stroke",
			w: 100,
			h: 100,
			visible: false,
			gamehud_displacement: 40
		});
		
		this.drawFunctions.push(this._gamehud_draw);
		this.drawFunctions.unshift(this._gamehud_drawSyscall);
		this.gamehud_keyMap = {};
	},
	
	_gamehud_onRemove: function() {
		delete this.gamehud_startVertex;
		delete this.gamehud_keyMap;
		delete this.gamehud_syscallName;	
	},
	
	gamehud_clear: function() {
		this.gamehud_keyMap = {};
	},
	
	gamehud_oppositeKey: function(key) {
		var list = KernelPanic.settings.keyList;
		var half = Math.floor(list.length/2);
		for (var i = 0; i < list.length; ++i) {
			if (list[i] == key) {
				if (i >= half)
					return list[i - half];
				else
					return list[i + half];
			}
		}
		return null;
	},
	
	gamehud_lineToKeyPair: function(x1, y1, x2, y2) {
		D.vector.x = x1;
		D.vector.y = y1;
		D.vector2.x = x2;
		D.vector2.y = y2;
		
		D.vector = D.vector2.subtract(D.vector).normalize();
			
		var angle = R.Vector.right.angleBetween(D.vector);
		if (angle < 0)
			angle += 2*Math.PI;

		// Find the closest key-angle to our angle, then verify that there"s no other
		var keyData = Tools.toClosest(angle, KernelPanic.settings.angleList);
		var key = KernelPanic.settings.keyList[keyData.i];
		
		// If the player was in the middle of the line, the first key
		// would go towards the first point.  The second key should 
		// represent movement towards the second point.
		return [this.gamehud_oppositeKey(key), key];
	},
	
	gamehud_load: function(data) {
		var edgeset = data.edgeSet;
		this.gamehud_syscallName = data.center;
		this.gamehud_startVertex = edgeset.startVertex;
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
		
		console.log(angles);
		while (angleBlacklist.length < angles.length
			&& keyAngleBlacklist.length < KernelPanic.settings.keyList.length) {
				
			// Find the closest key-angle to our angle, then verify that there"s no other
			// key-angle that"s closer
			var keyData = this._gamehud_toClosest(angles[i], KernelPanic.settings.angleList, keyAngleBlacklist);
			var angleData = this._gamehud_toClosest(keyData.value, angles, angleBlacklist);
			
			if (angleData.value == angles[i]) {
				console.log("matched " + KernelPanic.settings.keyList[keyData.i]);
				// Excellent, a matching!
				this.gamehud_keyMap[KernelPanic.settings.keyList[keyData.i]] = {
					direction: new Crafty.math.Vector2D(Math.cos(angles[i]), Math.sin(angles[i])),
					vertex: ends[i]
				};
				
				angleBlacklist.push(angleData.value);
				keyAngleBlacklist.push(keyData.value);
				//i = (i+1) % angles.length;
			} else {
				// If some other angle is closer to our key, then let's find out
				// who this new key should match to first.
				i = angleData.i;
			}
		}
	},
	
	_gamehud_toClosest: function(value, values, blacklist) {
		var maxValue = 2*Math.PI;
		var skip = false;
		var diff = Number.MAX_VALUE;
		var returnData = {
			value: NaN,
			i: -1
		};
		
		var skippedFirst = false;
		for (var i = 0; i < values.length; ++i) {
			// Check if our blacklist contains the current value we're checking
			if (blacklist) {
				skip = false;
				for (var j = 0; j < blacklist.length && !skip; ++j) {
					skip = blacklist[j] == values[i];
					
					skippedFirst |= (i == 0 && skip);
				}
				if (skip) continue;
			}
			
			localDiff = Math.abs(value - values[i]);
			if (localDiff <= diff) {
				diff = localDiff;
				returnData.value = values[i];
				returnData.i = i;
			}
		} 
		
		if (!skippedFirst) {
			localDiff = Math.abs(value - maxValue);
			if (localDiff <= diff) {
				diff = localDiff;
				returnData.value = values[0];
				returnData.i = 0;
			}
		}
		return returnData;
	},
	
	_gamehud_drawSyscall: function(data) {
		var ctx = data.ctx;
		
		if (this.gamehud_syscallName === null || this.gamehud_syscallName === undefined)
			return;
			
		ctx.save();
		
		// draw a black bar in the middle of our thing
		ctx.globalAlpha = this.alpha;
		ctx.fillStyle = this.strokeStyle;			
		var x = data.pos._x + this.lineWidth/2;
		var y = data.pos._y + (data.pos._h-this.lineWidth)/2;
		var w = data.pos._w - this.lineWidth;
		var h = this.lineWidth;
		ctx.fillRect(x, y, w, h);	
		
		ctx.fillStyle = "#FFFFFF";
		ctx.font = "bold 12px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(this.gamehud_syscallName + "", this.centerX(), this.centerY());	
		
		ctx.restore();		
	},
	
	_gamehud_draw: function(data) {
		var ctx = data.ctx;
		
		ctx.save();
		
		ctx.globalAlpha = this.alpha;
		ctx.fillStyle = "#FF0000";
		ctx.font = "bold 12px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		
		for (var key in this.gamehud_keyMap) {
			ctx.fillText(key, 
				(this.gamehud_displacement * this.gamehud_keyMap[key].direction.x + this.centerX()),
				(this.gamehud_displacement * this.gamehud_keyMap[key].direction.y + this.centerY()));
		}
		
		ctx.restore();
	}
});