/*
 * ProceduralMesh.js An exercise in animating a procedural mesh.  This code
 * generates points, then rearranges them into lines and triangles.  Then it
 * animates the results.
 *
 * The goal of the exercise is to optimize the data representation to reduce
 * the number of points being animated or stored, and to move the animation
 * calculations to the shader if possible.
 *
 * by Alex Clarke, 2017, updated 2019
 */


//----------------------------------------------------------------------------
// Variable Setup
//----------------------------------------------------------------------------

// This variable will store the WebGL rendering context
var gl;

//Data Buffers
var points = [];
var colors = [];
var mesh = {};

var vertexBuffer, colorBuffer;

//Grid size
var c = 20, r = 20;


//Variables for Transformation Matrices
var mv = new mat4();
var p  = new mat4();
var mvLoc, projLoc;

var program;
var canvas

//----------------------------------------------------------------------------
// Initialization Event Function
//----------------------------------------------------------------------------
window.onload = function init() {
	// Set up a WebGL Rendering Context in an HTML5 Canvas
	canvas = document.getElementById("gl-canvas");
	gl = WebGLUtils.setupWebGL(canvas);
	if (!gl) {
		alert("WebGL isn't available");
	}

	//  Configure WebGL
	//  eg. - set a clear color
	//      - turn on depth testing
	gl.clearColor(0.9, 0.9, 0.9, 1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.enable(gl.POLYGON_OFFSET_FILL);
	gl.polygonOffset(1,1);

	//  Load shaders and initialize attribute buffers
	program = initShaders(gl, "vertex-shader", "fragment-shader");
	gl.useProgram(program);

	// Set up data to draw
	mesh.points = {};
	mesh.points.Start = points.length;
	generatePoints(c,r,0);
	mesh.points.Vertices = points.length - mesh.points.Start;

	mesh.tris = {};
	mesh.tris.Start = points.length;
	generateTriangles(c,r);
	mesh.tris.Vertices = points.length - mesh.tris.Start;

	mesh.wires= {};
	mesh.wires.Start = points.length;
	points = points.concat(TrianglesToWireframe(points.slice(mesh.tris.Start, mesh.tris.Start + mesh.tris.Vertices)));
	mesh.wires.Vertices = points.length - mesh.wires.Start;

	//Construct and initialize colours array with a throw away value
	colors = Array(points.length).fill(vec4());

	// Load the data into GPU data buffers and
	// Associate shader attributes with corresponding data buffers
	//***Vertices***
	vertexBuffer = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
	gl.bufferData( gl.ARRAY_BUFFER,  flatten(points), gl.STATIC_DRAW );
	program.vPosition = gl.getAttribLocation(program, "vPosition");
	gl.vertexAttribPointer( program.vPosition, 4, gl.FLOAT, gl.FALSE, 0, 0 );
	gl.enableVertexAttribArray( program.vPosition );

	//***Colors***
	colorBuffer = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, colorBuffer );
	gl.bufferData( gl.ARRAY_BUFFER,  flatten(colors), gl.STATIC_DRAW );
	program.vColor = gl.getAttribLocation(program, "vColor");
	gl.vertexAttribPointer( program.vColor, 4, gl.FLOAT, gl.FALSE, 0, 0 );
	gl.enableVertexAttribArray( program.vColor );

	// Get addresses of shader uniforms
	program.p = gl.getUniformLocation(program, "p");
	program.mv = gl.getUniformLocation(program, "mv");

	requestAnimFrame(render);
};

//----------------------------------------------------------------------------
// Generates a 1D array full of points for a 2D grid
// width and height are the integer number of columns and rows in the 2D grid
// x and z are set to match width and height indices
//----------------------------------------------------------------------------
function generatePoints(width, height) 
{
	
	var count = 0;
	for (var j = 0; j <= height; j++)
	{
		for (var i = 0; i <= width; i++)
		{
			points[count] = (vec4(i/width,0,j/height,1));
			count++;
		}
	}
}	

//----------------------------------------------------------------------------
// Calculates y values and colours for vertices based on x and z values (indices)
//----------------------------------------------------------------------------
function updateHeightsAndColors(time)
{
	for (var i = 0; i < points.length; i++)
	{
		var h = Math.sin((points[i][0]+time) * Math.PI*2)/15 + Math.sin(points[i][2] * Math.PI*3)/20;
		points[i][1] = h;
		colors[i] = vec4(h*10-0.5,1-h*10-0.5,1,1);
	}
}

//----------------------------------------------------------------------------
// Generates Wire Strip from grid points
// Requires that a widthxheight grid already be present as the first
// set of data in points array.
//----------------------------------------------------------------------------
function generateWireStrip(width, height) {
	for (var j = 0; j < height; j++)
	{
		//Line across top of row
		for (var i = width; i > 0; i--)
		{
			points.push(points[i+j*(width+1)]);
		}

		//Zig-zag back
		for (var i = 0; i <= width; i++)
		{
			points.push(points[i+j*(width+1)]); //one on current row
			points.push(points[i+(j+1)*(width+1)]); //one on next row
		}
	}

	//Last line across bottom
	for (var i = width; i >= 0; i--)
	{
		points.push(points[i+height*(width+1)]);
	}
}

//----------------------------------------------------------------------------
// Generates Triangles from grid points
// Requires that a widthxheight grid already be present as the first
// set of data in points array.
//----------------------------------------------------------------------------
function generateTriangles(width, height) {
	for (var j = 0; j < height; j++)
	{
		for (var i = 0; i < width; i++)
		{
			points.push(points[i+(j)*(width+1)]);
			points.push(points[i+(j+1)*(width+1)]);
			points.push(points[i+1+(j)*(width+1)]);

			points.push(points[i+1+(j)*(width+1)]);
			points.push(points[i+(j+1)*(width+1)]);
			points.push(points[i+1+(j+1)*(width+1)]);
		}
	}
}

//----------------------------------------------------------------------------
// Rendering Event Function
//----------------------------------------------------------------------------
var roty = 0;
var time = 0;
function render() {
	//Support resizable canvas...
	//Set up viewport
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
	gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);

	//Set up projection matrix
	p = perspective(45.0, canvas.clientWidth/canvas.clientHeight, 0.1, 1000.0);
	gl.uniformMatrix4fv(program.p, gl.FALSE, flatten(p));


	gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

	//Set initial view
	var eye = vec3(0.0, 5.0, 8.0);
	var at =  vec3(0.0, 0.0, 0.0);
	var up =  vec3(0.0, 1.0, 0.0);

	mv = lookAt(eye,at,up);

	mv = mult(mv, rotate(roty,vec3(0,1,0)));
	roty+= 0.5;
	mv = mult(mv, translate(-3, 0, -3));
	mv = mult(mv, scale(6, 6, 6));


	//Animate the mesh and copy the updated data to gl buffers
	updateHeightsAndColors(time);
	gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
	gl.bufferSubData( gl.ARRAY_BUFFER, 0, flatten(points) );
	gl.bindBuffer( gl.ARRAY_BUFFER, colorBuffer );
	gl.bufferSubData( gl.ARRAY_BUFFER, 0, flatten(colors) );
	
	//Or update time in the shader so it can animate the vertex stream
	//gl.uniform1f(program.time, time);
	
	time += 0.01;

	gl.uniformMatrix4fv(program.mv, gl.FALSE, mv);
	gl.drawArrays(gl.TRIANGLES, mesh.tris.Start, mesh.tris.Vertices);

	//Wires and points will have solid colour, like a uniform	
	//Disabling a vertex attribute array allows it to take on a fixed value, a bit like a uniform
	gl.disableVertexAttribArray( program.vColor );

	//Set a disabled attribute like this
	gl.vertexAttrib4f( program.vColor, 0.0, 0.0, 0.0, 1.0 );

	gl.drawArrays(gl.LINES, mesh.wires.Start, mesh.wires.Vertices);
	gl.drawArrays(gl.POINTS, mesh.points.Start, mesh.points.Vertices);

	//Renable the vertex attrib array to permit per-vertex colour array to work again
	gl.enableVertexAttribArray( program.vColor );

	requestAnimFrame(render);
}

