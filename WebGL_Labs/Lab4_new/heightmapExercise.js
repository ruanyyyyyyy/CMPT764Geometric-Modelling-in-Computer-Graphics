/*
 * heightmapExercise.js
 * An exercise in translating Triangles to Wireframes
 * and a demonstration of using height maps with functions
 * and HTTP sourced images with HTML 5
 *
 * by Alex Clarke, 2019.
 */


//----------------------------------------------------------------------------
// Variable Setup
//----------------------------------------------------------------------------

// This variable will store the WebGL rendering context
var gl;

//Data Buffers
var points = [];
var elements = [];

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
	gl.clearColor(0.5, 0.5, 0.5, 1.0);
	gl.enable(gl.DEPTH_TEST);


	//  Load shaders and initialize attribute buffers
	//ALEX: program was declared here
	program = initShaders(gl, "vertex-shader", "fragment-shader");
	gl.useProgram(program);

	// Set up data to draw
	points = make2DMesh(vec2(-3,-3),vec2(3,3),23,23);
	shapes = {};
	shapes.hmap = {};
	shapes.hmap.Start = 0;
	shapes.hmap.Vertices = points.length;


	for (var i = 0; i < points.length; i++)
	{
		points[i][1] = Math.sin(points[i][0]*1.5)/3 + Math.sin(points[i][2]*1)/2;
	}

	// Try to build a wireframe representation from triangles
	try
	{
		shapes.hmapWires = {};
		shapes.hmapWires.Start = points.length;
		points = points.concat(TrianglesToWireframe(points));
		shapes.hmapWires.Vertices = points.length - shapes.hmapWires.Start;
	}
	catch(error)
	{
		console.log("TrianglesToWireframe stopped unexpectedly or not defined!");
		console.error(error);
		TrianglesToWireframe = null;
		shapes.hmapWires.Vertices = 0;
	}


	// Load the data into GPU data buffers and
	// Associate shader attributes with corresponding data buffers
	//***Vertices***
	var vertexBuffer = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
	gl.bufferData( gl.ARRAY_BUFFER,  flatten(points), gl.STATIC_DRAW );
	program.vPosition = gl.getAttribLocation(program, "vPosition");
	gl.vertexAttribPointer( program.vPosition, 4, gl.FLOAT, gl.FALSE, 0, 0 );
	gl.enableVertexAttribArray( program.vPosition );


	// Get addresses of shader uniforms
	projLoc = gl.getUniformLocation(program, "p");
	mvLoc = gl.getUniformLocation(program, "mv");
	color = gl.getUniformLocation(program, "uColor");

	//Set up viewport
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
	gl.viewport(0, 0, canvas.width, canvas.height);

	//Set up projection matrix
	p = perspective(45.0, canvas.clientWidth/canvas.clientHeight, 0.1, 1000.0);
	gl.uniformMatrix4fv(projLoc, gl.FALSE, flatten(p));


	requestAnimFrame(render);
};


function make2DMesh(xzMin, xzMax, xDivs, zDivs)
{
	var ret = [];
	if (xzMin.type != 'vec2' || xzMax.type != 'vec2')
	{
		throw "make2DMesh: either xzMin or xzMax is not a vec2";
	}

	var dim = subtract(xzMax, xzMin);
	var dx = dim[0] / (xDivs);
	var dz = dim[1] / (zDivs);

	for (var x = xzMin[0]; x < xzMax[0]; x+=dx)
	{
		for (var z = xzMin[1]; z < xzMax[1]; z+=dz)
		{
			//Triangle 1
			//  x,z
			//   |\
			//   |  \
			//   |    \
			//   |      \
			//   |        \
			//   |__________\
			// x,z+dz      x+dx,z+dz 
			ret.push(vec4(   x, 0,   z,1));
			ret.push(vec4(   x, 0,z+dz,1));
			ret.push(vec4(x+dx, 0,z+dz,1));

			//Triangle 2
			//  x,z         x+dx,z
			//    \----------|
			//      \        |
			//        \      |
			//          \    |
			//            \  |
			//              \|
			//           x+dx,z+dz 
			ret.push(vec4(   x, 0,   z,1));
			ret.push(vec4(x+dx, 0,z+dz,1));
			ret.push(vec4(x+dx, 0,   z,1));
		}
	}
	return ret;
}

//----------------------------------------------------------------------------
// Rendering Event Function
//----------------------------------------------------------------------------
var a = 0;
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
	var eye = vec3(0.0, 5.0, 10);
	var at =  vec3(0.0, 0.0, 0.0);
	var up =  vec3(0.0, 1.0, 0.0);

	mv = lookAt(eye,at,up);
	mv = mult(mv, rotate(a, vec3(0,1,0)));
	a += 0.5;
	gl.uniformMatrix4fv(mvLoc, gl.FALSE, flatten(mv));
	gl.uniform4f(color, 1,1,1,1);
	gl.drawArrays(gl.TRIANGLES, shapes.hmap.Start, shapes.hmap.Vertices);
	gl.uniform4f(color, 0,0,0,1);
	//gl.drawArrays(gl.POINTS, shapes.hmap.Start, shapes.hmap.Vertices);

	if (TrianglesToWireframe != null)
	{
		gl.drawArrays(gl.LINES, shapes.hmapWires.Start, shapes.hmapWires.Vertices);
	}
	requestAnimFrame(render);
}


