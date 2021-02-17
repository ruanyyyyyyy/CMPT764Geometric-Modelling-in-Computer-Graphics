/*
 * cubeExercise.js
 * An exercise in translating face lookups into wire frame and triangles
 *
 * by Alex Clarke, 2019.
 */


//----------------------------------------------------------------------------
// Variable Setup 
//----------------------------------------------------------------------------

// This variable will store the WebGL rendering context
var gl;

var cubeVerts = [
	[ 0.5, 0.5, 0.5, 1], //0
	[ 0.5, 0.5,-0.5, 1], //1
	[ 0.5,-0.5, 0.5, 1], //2
	[ 0.5,-0.5,-0.5, 1], //3
	[-0.5, 0.5, 0.5, 1], //4
	[-0.5, 0.5,-0.5, 1], //5
	[-0.5,-0.5, 0.5, 1], //6
	[-0.5,-0.5,-0.5, 1], //7
];


//Lookup patterns from cubeVerts for different primitive types
var cubeFaces = [
	[0,4,6,2], //front
	[1,0,2,3], //right
	[5,1,3,7], //back
	[4,5,7,6], //right
	[4,0,1,5], //top
	[6,7,3,2], //bottom
];

var points = []; //Declare empty points array
var shapes = {}; //Declare empty shapes object (associative array)

// TrianglesToWireframe 
// Inputs:
//    vertices: array of vertices ready to draw with WebGL as
//              primitive type TRIANGLES
// Outputs:
//    returns an array of vertices that outline each triangle
//    when drawn as primitive type LINES 
function TrianglesToWireframe(vertices)
{
	//Declare a return array

	//loop index i from [0 to vertices length), counting by 3s
	{
		//add vertex at index i to return array
		//add two copies of vertex at index i + 1 to return array
		//add two copies of vertex at index i + 2 to return array
		//add vertex at index i to return array
	}
	//return the return array
}


//Try-catch allows wireCube to be used even if solidCube fails
try
{
	//Use FacesToWireframe something like this
	shapes.wireCube = {}; //Declare wireCube as an associative array
	shapes.wireCube.Start = points.length;
	points = points.concat(FacesToWireframe(cubeVerts,cubeFaces));
	shapes.wireCube.Vertices = points.length - shapes.wireCube.Start;
}
catch (error)
{
	console.error(error);
	console.log("FacesToWireframe has failed to complete or is not defined!");
	FacesToWireframe = null;
	shapes.wireCube.Vertices = 0;
}

//Try-catch allows solidCube to be used even if wireCube fails
try
{
	//Use FacesToTriangles something like this
	shapes.solidCube = {}; //Declare solidCube as an associative array
	shapes.solidCube.Start = points.length;
	points = points.concat(FacesToTriangles(cubeVerts,cubeFaces));
	shapes.solidCube.Vertices = points.length - shapes.solidCube.Start;
}
catch (error)
{
	console.error(error);
	console.log("FacesToTriangles has failed to complete or is not defined!");
	FacesToTriangles = null;
	shapes.solidCube.Vertices = 0;
}


var colors = [];
for (var i = 0; i < points.length; i++)
{
	colors.push(vec4(1,1,1,1));
}

for (var i = shapes.wireCube.Start; i < shapes.wireCube.Start + shapes.wireCube.Vertices; i++)
{
	colors[i] = vec4(1,0,0,1);
}

//Variables for Transformation Matrices
var mv = new mat4();
var p  = new mat4();
var mvLoc, projLoc;


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

	//  Load shaders and initialize attribute buffers
	var program = initShaders(gl, "vertex-shader", "fragment-shader");
	gl.useProgram(program);

	// Set up data to draw
	// Done globally in this program...

	// Load the data into GPU data buffers and
	// Associate shader attributes with corresponding data buffers
	if (points.length != 0)
	{
		//***Vertices***
		var vertexBuffer = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
		gl.bufferData( gl.ARRAY_BUFFER,  flatten(points), gl.STATIC_DRAW );
		program.vPosition = gl.getAttribLocation(program, "vPosition");
		gl.vertexAttribPointer( program.vPosition, 4, gl.FLOAT, gl.FALSE, 0, 0 );
		gl.enableVertexAttribArray( program.vPosition );
	}

	if (colors.length != 0)
	{
		//***Colors***
		var colorBuffer = gl.createBuffer();
		gl.bindBuffer( gl.ARRAY_BUFFER, colorBuffer );
		gl.bufferData( gl.ARRAY_BUFFER,  flatten(colors), gl.STATIC_DRAW );
		program.vColor = gl.getAttribLocation(program, "vColor");
		gl.vertexAttribPointer( program.vColor, 4, gl.FLOAT, gl.FALSE, 0, 0 );
		gl.enableVertexAttribArray( program.vColor );
	}
	// Get addresses of shader uniforms
	projLoc = gl.getUniformLocation(program, "p");
	mvLoc = gl.getUniformLocation(program, "mv");


	//Set up viewport - see WebGL Anti Patterns link
	gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

	//Set up projection matrix
	p = perspective(45.0, gl.drawingBufferWidth/gl.drawingBufferHeight, 0.1, 100.0);
	gl.uniformMatrix4fv(projLoc, gl.FALSE, p);


	requestAnimFrame(render);
};



//----------------------------------------------------------------------------
// Rendering Event Function
//----------------------------------------------------------------------------
var r = 0;
function render() {
	//Set up viewport
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
	gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

	//Set up projection matrix
	p = perspective(45.0, canvas.clientWidth/canvas.clientHeight, 0.1, 1000.0);
	gl.uniformMatrix4fv(projLoc, gl.FALSE, flatten(p));

	gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

	//Set initial view
	var eye = vec3(0.0, 1.0, 2.5);
	var at =  vec3(0.0, 0.0, 0.0);
	var up =  vec3(0.0, 1.0, 0.0);

	mv = lookAt(eye,at,up);

	mv = mult(mv, rotate(r, vec3(0,1,0)));
	gl.uniformMatrix4fv(mvLoc, gl.FALSE, mv);

	if (FacesToTriangles != null)
	{
		gl.drawArrays(gl.TRIANGLES, shapes.solidCube.Start, shapes.solidCube.Vertices);	
	}

	if (FacesToWireframe != null)
	{
		gl.drawArrays(gl.LINES, shapes.wireCube.Start, shapes.wireCube.Vertices);	
	}
	r += 0.5;
	requestAnimFrame(render);
}

