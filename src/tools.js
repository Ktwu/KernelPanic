var Tools = {
	
	are2DVEqual: function(a,b) {
		return (a && b && a.x == b.x && a.y == b.y);	
	},
	
	sort2DVFunction: function(a,b) {
		var diff = a.x - b.x
		return (diff == 0) ? a.y - b.y : diff;
	},
	
	shouldClamp: function (a,b,c) {
		var min = Math.min(a,c);
		var max = Math.max(a,c);
		return (b < min || b > max);
	},
	
	cloneArray: function(array) {
		return array.slice(0);
	},
	
	clamp: function (a,b,c) {
		// Clamps our middle value so that we're 
		var min = Math.min(a,c);
		var max = Math.max(a,c);
		
		if (b < min || b > max)
			return Math.max(min, Math.min(max, b));
		else
			return b;
	},
	
	toClosest: function(value, values, blacklist) {
		var skip = false;
		var diff = Number.MAX_VALUE;
		var returnData = {
			value: NaN,
			i: -1
		};
		
		for (var i = 0; i < values.length; ++i) {
			// Check if our blacklist contains the current value we're checking
			if (blacklist) {
				skip = false;
				for (var j = 0; j < blacklist.length && !skip; ++j) {
					skip = blacklist[j] == values[i];
				}
				if (skip) continue;
			}
			
			localDiff = Math.abs(value - values[i]);
			if (localDiff < diff) {
				diff = localDiff;
				returnData.value = values[i];
				returnData.i = i;
			}
		} 
		
		return returnData;
	},
	
	toFarthest: function(value, values, blacklist) {
		var skip = false;
		var returnData = {
			diff: -Number.MAX_VALUE,
			value: NaN,
			index: -1
		};
		
		for (var i = 0; i < values.length; ++i) {
			// Check if our blacklist contains the current value we're checking
			if (blacklist) {
				skip = false;
				for (var j = 0; j < blacklist.length && !skip; ++j) {
					skip = blacklist[j] == values[i];
				}
				if (skip) continue;
			}
			
			localDiff = Math.abs(value - values[i]);
			if (localDiff > returnData.diff) {
				returnData.diff = localDiff;
				returnData.value = values[i];
				returnData.index = i;
			}
		} 
		
		return returnData;
	},
	
	delta: function (a,b) {
		return Math.abs(a-b);
	},
	
	epsilon: 0.001,
	isNegligableDiff: function (a,b) {
		return Math.abs(a-b) < this.epsilon;
	}
};
