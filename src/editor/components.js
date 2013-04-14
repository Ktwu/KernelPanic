Crafty.c("KernelPanicEditor", {
	activeNode: null,
	catcher: null,
	nodes: [],
	
	label: "",	
	
	scaleAmount: 1.25,
	shiftAmount: 50,	
	keyStrings: {},
	syscallPropMap: {
		VANISH: "Vanish",
		EXEC:   "Exec",
		FORK:   "Fork"
	},
	
	init: function() {
		var editor = this;
		
		this.bind("EnterFrame", function() {
			var canvas = Crafty.canvas._canvas;
			Crafty.canvas.context.clearRect(
				this.x,
				this.y,
				this.w,
				this.h
			);
			Crafty.DrawManager.drawAll();
		});
		
		for (var key in Crafty.keys) {
			if (key == "COMMA") 
				this.keyStrings[Crafty.keys[key]] = ",";
			else
				this.keyStrings[Crafty.keys[key]] = key;
		}
	
		this.textInput = Crafty.e("Canvas, Text")
			.textColor("#FFFFFF")
			.textFont({family: "Ariel", size: "24px"})
			.bind("EnterFrame", function(e) {
				this.attr({
					x: 50-Crafty.viewport.x,
					y: 50-Crafty.viewport.y
				});
			})
			.bind("KeyDown", function(e) {
				var label = editor.label;
				var keyStrings = editor.keyStrings;
				var shiftAmount = editor.shiftAmount;
				
				if (e.key == Crafty.keys.BACKSPACE || e.key == Crafty.keys.DELETE) {
					if (label.length > 0) {
						editor.label = label.substring(0, label.length - 1);
						this.text(editor.label);
					}
					
				} else if (e.key == Crafty.keys.SPACE) {
					// Output our nodes to JSON.  Exciting.
					console.log("Getting JSON...");
					console.log(JSON.stringify(editor.nodesToJSON()));
					
				} else if (keyStrings[e.key].length == 1) {
					editor.label += keyStrings[e.key];
					this.text(editor.label);
					
				} else if (e.key == Crafty.keys.LEFT_ARROW) {
					Crafty.viewport.x += shiftAmount;
				} else if (e.key == Crafty.keys.RIGHT_ARROW) {
					Crafty.viewport.x -= shiftAmount;
				}
				
				else if (e.key == Crafty.keys.UP_ARROW) {
					Crafty.viewport.y += shiftAmount;
				} else if (e.key == Crafty.keys.DOWN_ARROW) {
					Crafty.viewport.y -= shiftAmount;
				}
			})
			.attr({
				x: 50,
				y: 50,
				z: 10
			});
	
		// Create two guide marks on our viewport.
		this.circle1 = Crafty.e("Ellipse")
			.attr({
				x: 0,
				y: 0,
			}).enableDrawing();
		this.circle2 = Crafty.e("Ellipse")
			.attr({
				x: 0,
				y: Crafty.viewport.height - this.circle1.h
			}).enableDrawing();
			
		this.catcher = Crafty.e("ScreenMouseCatcher")
			.attr({editor: this})
			.bind("MouseWheel", function(e) {
		       //equalize event object  
		       var evt=window.event || e;
		       
		       //check for detail first so Opera uses that instead of wheelDelta  
		       var delta=evt.detail? evt.detail*(-120) : evt.wheelDelta; 
		       
		       // get sign of delta for scale direction
		       var scaleAmount = editor.scaleAmount;
		       if (delta <= 0)
		       		scaleAmount = 1/scaleAmount;
		       		
		       	Crafty.viewport.scale(scaleAmount);
		       	Crafty.viewport.width /= scaleAmount;
		       	Crafty.viewport.height /= scaleAmount;
				this.w /= scaleAmount;
				this.h /= scaleAmount;
		
		       //disable default wheel action of scrolling page  
		       if (evt.preventDefault) 
		        evt.preventDefault()
		       else
		        return false
		    });
	},	

	jsonProcessLabel: function(node, json) {
		json.vertexBase[0] = Math.min(json.vertexBase[0], node.x);
		json.vertexBase[1] = Math.min(json.vertexBase[1], node.y);
		
		var labels = node.nodeLabel._text.split(',');
		var label = labels[0];
		
		if (label == "START") {
			json.start = {
				x1: node.x, y1: node.y, x2: node.x, y2: node.y 
			};
		}
		
		// Check for syscall
		var prop = this.syscallPropMap[label];	
		if (prop) {	
			if (!json.syscalls[prop])
				json.syscalls[prop] = [];
			json.syscalls[prop].push([node.x, node.y]);
		}
		
		// Check for mutex
		if (label == "MUTEX") {
			if (!json.mutexes[labels[1]])
				json.mutexes[labels[1]] = { locks: [], keys: [] };
			var mutex = json.mutexes[labels[1]];
			
			if (labels[2] == "LOCK")
				mutex.locks.push([node.x, node.y]);
			else
				mutex.keys.push([node.x, node.y]);
		}
		
		// Go through the rest of our label options
		for (var i = 0; i < labels.length; ++i) {
			if (labels[i] == 'X') {
				json.centerX = node.x;
			}
		}
	},
	
	nodesToJSON: function() {
		var json = {};
		
		json.list = [];
		json.vertexBase = [Number.MAX_VALUE, Number.MAX_VALUE];
		json.syscalls = {};
		json.mutexes = [];
		json.strokeStyle = "#FFFFFF";
		json.lineWidth = 3;
		
		var list = json.list;
		for (var i = 0; i < this.nodes.length; ++i) {
			list[i] = [];
			var node = this.nodes[i];	
				
			this.jsonProcessLabel(node, json);
			
			list[i].push([node.x, node.y]);
			var otherNodes = node.otherNodes;
			for (var j = 0; j < otherNodes.length; ++j) {
				var otherNode = otherNodes[j];
				list[i].push([otherNode.x, otherNode.y]);
			} 
		}
		
		json.vertexBase[1] = 0;
		return json;
	}
});

Crafty.c("ScreenMouseCatcher", {
	editor: null,
	
	init: function() {
		this.requires("2D, Mouse")
		.attr({
			x: 0,
			y: 0,
			w: Crafty.canvas._canvas.width,
			h: Crafty.canvas._canvas.height,
		})
		.bind("EnterFrame", function(e) {
			this.attr({
				x: -Crafty.viewport.x,
				y: -Crafty.viewport.y
			});
		});
		
		this.bind("NodeDestroy", function(e) {
			var index = this.editor.nodes.indexOf(e);
			var editor = this.editor;
			if (index >= 0)
				editor.nodes.splice(index, 1);
			if (e == editor.activeNode)
				editor.activeNode = null;
		});
		
		this.bind("MouseDown", function(e) {
			if (Crafty.mouseButtons.LEFT == e.button) {
				var editor = this.editor;
				var node = 
					Crafty.e("Node")
					.attr({editor: this.editor})
					.centerOn(e.realX, e.realY)
					.enableDrawing()
					.snap();
				
				console.log("new node");
				editor.nodes.push(node);
				e.cancelBubble = true;
				
				if (editor.activeNode) {
					editor.activeNode.otherNodes.push(node);
					node.otherNodes.push(editor.activeNode);
				}
				
				node.node_focus();
				
			} else if (Crafty.mouseButtons.RIGHT == e.button) {
				if (this.editor.activeNode) {
					this.editor.activeNode.node_unfocus();
				}
			}
		})
	}
});

Crafty.c("Node", {
	editor: null,
	otherNodes: null,
	nodeLabel: "",
	
	init: function() {
		this.requires('Ellipse, Mouse, Draggable, Snappable')
		.attr({
			onClose: "fill",
			fillStyle: "#888888",
			w: 40,
			h: 40,
			snapX: 50,
			snapY: 50,
		});
		
		this.nodeLabel = Crafty.e("Text, Canvas, Center")
		.textColor("#0000FF")
		.textFont({familly: "Ariel", size: "15px"});
		this.attach(this.nodeLabel);
		this.nodeLabel.z = 9;
		this.nodeLabel.x = this.centerX();
		this.nodeLabel.y = this.centerY();
		
		this.otherNodes = [];
		this.drawFunctions.unshift(this.node_drawConnections);
		
		this.bind("StartDrag", this.node_onStartDrag)
		.bind("StopDrag", this.node_onStopDrag)
		.bind("MouseDown", this.node_onMouseDown)
		.bind("NodeDestroy", this.node_onNodeDestroyed)
		.bind("Remove", this.node_onRemove);
		
		this.enableDrag();
	},
	
	node_onRemove: function() {
		this.otherNodes.length = 0;
		delete this.otherNodes;
	},
	
	node_onNodeDestroyed: function(e) {
		var index = this.otherNodes.indexOf(e);
		if (index >= 0)
			this.otherNodes.splice(index, 1);
	},
	
	node_onMouseDown: function(e) {
		if (e.button == Crafty.mouseButtons.LEFT) {
			this.node_focus();
		} else if (e.button == Crafty.mouseButtons.RIGHT) {
			Crafty.trigger("NodeDestroy", this);
			this.destroy();
		}
	},

	node_onStartDrag: function() {
		var activeNode = this.editor.activeNode;
		if (activeNode && activeNode != this
			&& activeNode.otherNodes.indexOf(this) < 0
			&& this.otherNodes.indexOf(activeNode) < 0) {
			activeNode.otherNodes.push(this);
		}
		this.node_focus();
	},
	
	node_onStopDrag: function() {
		this.snap();
	},
	
	node_focus: function(e) {
		var editor = this.editor;
		if (editor.activeNode)
			editor.activeNode.node_unfocus();
			
		this.nodeLabel.text(editor.label);
		this.nodeLabel.centerOn(this.centerX(), this.centerY());
		
		editor.activeNode = this;
		this.fillStyle = "#FFFFFF";
		console.log("Focused on node at (" + this.x + "," + this.y + ")");
	},
	
	
	node_unfocus: function(e) {
		var editor = this.editor;
		if (editor.activeNode == this) {
			editor.activeNode = null;
			this.fillStyle = "#888888";
		}
	},
	
	node_drawConnections: function(e) {
		var ctx = e.ctx;
		
		ctx.strokeStyle = "#FFFFFF";
		ctx.lineWidth = 5;
		ctx.beginPath();
		
		for (var i = 0; i < this.otherNodes.length; ++i) {
			var otherNode = this.otherNodes[i];
			
			ctx.moveTo(this.centerX(), this.centerY());
			ctx.lineTo(otherNode.centerX(), otherNode.centerY());
		}
	   	
	    ctx.closePath();
	    ctx.stroke();
	}
});
