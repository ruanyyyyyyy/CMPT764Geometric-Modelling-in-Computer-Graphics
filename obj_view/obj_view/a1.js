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
var obj1; // obj from uploaded file
var obj2;
var obj3;

//Data Buffers
var points = [];
var colors = [];
var normals = [];
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

var cubeRotation = 0.0;
var cubeTranslation = 0.0;
var cubeRotation1 = 0.0;
var cubeTranslation1 = 0.0;
var cubeZoom = 1.0;

var flag = false;
var flagHand = false;
var flagHorse = false;
var flag_mode = 4;
var responsetext;
var vertices = [
    vec4(-0.5, -0.5,  0.5, 1.0),
    vec4(-0.5,  0.5,  0.5, 1.0),
    vec4(0.5,  0.5,  0.5, 1.0),
    vec4(0.5, -0.5,  0.5, 1.0),
    vec4(-0.5, -0.5, -0.5, 1.0),
    vec4(-0.5,  0.5, -0.5, 1.0),
    vec4(0.5,  0.5, -0.5, 1.0),
    vec4(0.5, -0.5, -0.5, 1.0)
];


function initShaders( gl, vertexShaderId, fragmentShaderId )
{
    var vertShdr;
    var fragShdr;

    var vertElem = document.getElementById( vertexShaderId );
    if ( !vertElem ) {
        alert( "Unable to load vertex shader " + vertexShaderId );
        return -1;
    }
    else {
        vertShdr = gl.createShader( gl.VERTEX_SHADER );
        gl.shaderSource( vertShdr, vertElem.textContent.replace(/^\s+|\s+$/g, '' ));
        gl.compileShader( vertShdr );
        if ( !gl.getShaderParameter(vertShdr, gl.COMPILE_STATUS) ) {
            var msg = "Vertex shader failed to compile.  The error log is:"
        	+ "<pre>" + gl.getShaderInfoLog( vertShdr ) + "</pre>";
            alert( msg );
            return -1;
        }
    }

    var fragElem = document.getElementById( fragmentShaderId );
    if ( !fragElem ) {
        alert( "Unable to load vertex shader " + fragmentShaderId );
        return -1;
    }
    else {
        fragShdr = gl.createShader( gl.FRAGMENT_SHADER );
        gl.shaderSource( fragShdr, fragElem.textContent.replace(/^\s+|\s+$/g, '' ) );
        gl.compileShader( fragShdr );
        if ( !gl.getShaderParameter(fragShdr, gl.COMPILE_STATUS) ) {
            var msg = "Fragment shader failed to compile.  The error log is:"
        	+ "<pre>" + gl.getShaderInfoLog( fragShdr ) + "</pre>";
            alert( msg );
            return -1;
        }
    }

    var program = gl.createProgram();
    gl.attachShader( program, vertShdr );
    gl.attachShader( program, fragShdr );
    gl.linkProgram( program );

    if ( !gl.getProgramParameter(program, gl.LINK_STATUS) ) {
        var msg = "Shader program failed to link.  The error log is:"
            + "<pre>" + gl.getProgramInfoLog( program ) + "</pre>";
        alert( msg );
        return -1;
    }

    return program;
}


function updateSlider_R(slideAmount) {
	var sliderDiv = document.getElementById("sliderAmount");
    cubeRotation += parseFloat(slideAmount);
    //console.log(cubeRotation);
}

function updateSlider_R1(slideAmount) {
	var sliderDiv = document.getElementById("sliderAmount_Y");
    cubeRotation1 += parseFloat(slideAmount);
    //console.log(cubeRotation);
}


function updateSlider_T(slideAmount) {
    var sliderDiv = document.getElementById("sliderAmount_trans");
    cubeTranslation = parseFloat(slideAmount)
    //console.log(cubeTranslation);	
}

function updateSlider_T1(slideAmount) {
    var sliderDiv = document.getElementById("sliderAmount_trans_XZ");
    cubeTranslation1 = parseFloat(slideAmount)
    //console.log(cubeTranslation);	
}


function updateSlider_Z(slideAmount) {
    var sliderDiv = document.getElementById("sliderAmount_zoom");
    cubeZoom = parseFloat(slideAmount)
    //console.log(cubeZoom);	
}

/**
 * An object that contains a set of points 
 * @constructor
 */
function PointsData()
{
    // 3d coordinates
    var self = this;
    self.coords= []; // a Float32Array; 3 components per vertex (x,y,z)
    self.edges = [];
    self.vertex_normals = vec3(0.0, 0.0, 0.0);
} 

// /**
//  * An object that contains a set of lines and their colors, suitable for
//  * rendering using gl.LINES mode.
//  * @constructor
//  */
// function LinesData() {
//     var self = this;
//     self.vertices = [];   // a Float32Array; 3 components per vertex (x,y,z)
//     self.colors = [];   // a Float32Array; 3 components per vertex RGB
//     self.textures = [];   // a Float32Array; 1 component per vertex
//     self.material = null; // a Material object
// }
function EdgesData() {
    var self = this;
    self.origin = [];
    self.destination = [];
    self.leftFace = [];
    self.rightFace = [];
    self.leftcw = [];
    self.leftccw = [];
    self.rightcw = [];
    self.rightccw = [];
}



/**
 * A collection of triangles that can all be rendered using gl.TRIANGLES.
 * @constructor
 */
function TrianglesData() {
    var self = this;
    self.vertices = [];       // a Float32Array; index of per vertex 
    self.flat_normals = [];   // a Float32Array; 3 components per vertex <dx,dy,dz>
    //self.smooth_normals = []; // a Float32Array; 3 components per vertex <dx,dy,dz>
    self.edges = [];
}

/**
 * Definition of an object that stores arrays of data for one model. A model
 * can contain points, lines, and triangles.
 * @constructor
 */
function ModelArrays(name) {
    var self = this;
    self.name = name;     // The name of this model
    self.points = null;   // a PointsData object, if the model contains points
    self.edges = null;    // a EdgesData object, if the model contains Edges
    self.triangles = null;// a TrianglesData object, it the model contains triangles
}


// Array of Objects curently loading
var g_loadingObjects = [];
function log(msg) {
    if (window.console && window.console.log) {
        window.console.log(msg);
    }
}
  

//
// loadObj
//
// Load a .obj file from the passed URL. Return an object with a 'loaded' property set to false.
// When the object load is complete, the 'loaded' property becomes true and the following
// properties are set:
//
//  normalObject        WebGLBuffer object for normals
//  texCoordObject      WebGLBuffer object for texCoords
//  vertexObject        WebGLBuffer object for vertices
//  indexObject         WebGLBuffer object for indices
//  numIndices          The number of indices in the indexObject
//
function loadObj(ctx, url) {
    var obj = { loaded: false };
    obj.ctx = ctx;
    var req = new XMLHttpRequest();
    req.obj = obj;
    g_loadingObjects.push(req);
    req.onreadystatechange = function () { processLoadObj(req) };
    req.open("GET", url, true);
    req.send(null);
    return obj;
}

function processLoadObj(req) {
    log("req=" + req + ": " + req.status);
    // only if req shows "complete"
    if (req.readyState == 4) {
        g_loadingObjects.splice(g_loadingObjects.indexOf(req), 1);
        responsetext = req.responseText;
        doLoadObj(req.obj, req.responseText);
        log("object loaded.");
    }
}

function doLoadObj(obj, text) {
    vertexArray = [];
    normalArray = [];
    avg_normalArray = [];

    textureArray = [];
    indexArray = [];

    var vertex = [];
    var normal = [];
    //var flat_normals = [];
    //var smooth_normals = [];
    var texture = [];
    var facemap = {};
    var index = 0;
    var avgindex = 0;

    var triangles = []; // array of triangles
    var points = []; //array of points

    var wevMap = {};
    var weeMap = {};

    // This is a map which associates a range of indices with a name
    // The name comes from the 'g' tag (of the form "g NAME"). Indices
    // are part of one group until another 'g' tag is seen. If any indices
    // come before a 'g' tag, it is given the group name "_unnamed"
    // 'group' is an object whose property names are the group name and
    // whose value is a 2 element array with [<first index>, <num indices>]
    var groups = {};
    var currentGroup = [-1, 0];
    groups["_unnamed"] = currentGroup;

    var lines = text.split("\n");
    for (var lineIndex in lines) {
        var line = lines[lineIndex].replace(/[ \t]+/g, " ").replace(/\s\s*$/, "");

        // ignore comments
        if (line[0] == "#")
            continue;

        var array = line.split(" ");
        if (array[0] == "g") {
            // new group
            currentGroup = [indexArray.length, 0];
            groups[array[1]] = currentGroup;
        }
        else if (array[0] == "v") {
            // vertex
            vertex.push(parseFloat(array[1]));
            vertex.push(parseFloat(array[2]));
            vertex.push(parseFloat(array[3]));
            p = new PointsData();
            p.coords = vec3(parseFloat(array[1]), parseFloat(array[2]), parseFloat(array[3]));
            wevMap[points.length] = p;
            points.push(p);
        }
        else if (array[0] == "vt") {
            // normal
            texture.push(parseFloat(array[1]));
            texture.push(parseFloat(array[2]));
        }
        else if (array[0] == "vn") {
            // normal
            normal.push(parseFloat(array[1]));
            normal.push(parseFloat(array[2]));
            normal.push(parseFloat(array[3]));
        }
        else if (array[0] == "f") {
            // face
            if (array.length != 4) {
                log("*** Error: face '" + line + "' not handled");
                continue;
            }
            triangle = new TrianglesData();
            p1 = parseInt(array[1])-1; // index of the point
            p2 = parseInt(array[2])-1;
            p3 = parseInt(array[3])-1;

            triangle.vertices = vec3(p1, p2, p3);

            // calc Normal
            var selectEdge1 = subtract(wevMap[p1].coords, wevMap[p2].coords);
            var selectEdge2 = subtract(wevMap[p2].coords, wevMap[p3].coords);
            var face_normal = normalize(cross(selectEdge1, selectEdge2));
            face_normal = vec3(face_normal);
            //add face_normal to each triangle
            triangle.flat_normals = face_normal;
            //add face_normal to each vertex. Then normalize at the end
            wevMap[p1].vertex_normals = add(wevMap[p1].vertex_normals, face_normal);
            wevMap[p2].vertex_normals = add(wevMap[p2].vertex_normals, face_normal);
            wevMap[p3].vertex_normals = add(wevMap[p3].vertex_normals, face_normal);
            

            var e1 = [p1, p2];
            var e1_r = [p2, p1];
            var e2 = [p2, p3];
            var e2_r = [p3, p2];
            var e3 = [p3, p1];
            var e3_r = [p1, p3];
            
            if(!(e1 in weeMap) && !(e1_r in weeMap)) {
                edge1 = new EdgesData();
                edge1.origin = p1;
                edge1.destination = p2;
                edge1.leftFace = triangle; //override?
                edge1.leftccw = e2;
                edge1.leftcw = e3; // when search for matching edge, use e3 and e3_r
                weeMap[e1] = edge1;

                wevMap[p1].edges = edge1;
                triangle.edges = edge1;
            } else {
                edge1 = weeMap[e1_r];
                edge1.rightFace = triangle;
                edge1.rightcw = e3;
                edge1.rightccw = e2;

                triangle.edges = edge1;
            }

            if(!(e2 in weeMap) && !(e2_r in weeMap)) {
                edge2 = new EdgesData();
                edge2.origin = p2;
                edge2.destination = p3;
                edge2.leftFace = triangle; //override?
                edge2.leftccw = e3;
                edge2.leftcw = e1; // when search for matching edge, use e3 and e3_r
                weeMap[e2] = edge2;

                wevMap[p2].edges = edge2;
            } else {
                edge2 = weeMap[e2_r];
                edge2.rightFace = triangle;
                edge2.rightcw = e1;
                edge2.rightccw = e3;
            }

            if(!(e3 in weeMap) && !(e3_r in weeMap)) {
                edge3 = new EdgesData();
                edge3.origin = p3;
                edge3.destination = p1;
                edge3.leftFace = triangle; //override?
                edge3.leftccw = e1;
                edge3.leftcw = e2; // when search for matching edge, use e3 and e3_r
                weeMap[e3] = edge3;
                wevMap[p3].edges = edge3;
            } else {
                edge3 = weeMap[e3_r];
                edge3.rightFace = triangle;
                edge3.rightcw = e2;
                edge3.rightccw = e1;
            }

            triangles.push(triangle);
            
            for (var i = 1; i < 4; ++i) {
                
                //if (!(array[i] in facemap)) {
                    // add a new entry to the map and arrays
                    var f = array[i].split("/");
                    var vtx, nor, tex;

                    if (f.length == 1) {
                        vtx = parseInt(f[0]) - 1;
                        nor = vtx;
                        tex = vtx;
                    }
                    else if (f.length = 3) {
                        vtx = parseInt(f[0]) - 1;
                        tex = parseInt(f[1]) - 1;
                        nor = parseInt(f[2]) - 1;
                    }
                    else {
                        obj.ctx.console.log("*** Error: did not understand face '" + array[i] + "'");
                        return null;
                    }

                    // do the vertices
                    var x = 0;
                    var y = 0;
                    var z = 0;
                    if (vtx * 3 + 2 < vertex.length) {
                        x = vertex[vtx * 3];
                        y = vertex[vtx * 3 + 1];
                        z = vertex[vtx * 3 + 2];
                    }
                    vertexArray.push(x);
                    vertexArray.push(y);
                    vertexArray.push(z);

                    // do the textures
                    x = 0;
                    y = 0;
                    if (tex * 2 + 1 < texture.length) {
                        x = texture[tex * 2];
                        y = texture[tex * 2 + 1];
                    }
                    textureArray.push(x);
                    textureArray.push(y);

                    // do the normals
                    x = 0;
                    y = 0;
                    z = 1;
                    
                    normalArray.push(face_normal[0]);
                    normalArray.push(face_normal[1]);
                    normalArray.push(face_normal[2]);
                    //console.log(normalArray)
                    // if (nor * 3 + 2 < normal.length) {
                    //     x = normal[nor * 3];
                    //     y = normal[nor * 3 + 1];
                    //     z = normal[nor * 3 + 2];
                    // }
                    // normalArray.push(x);
                    // normalArray.push(y);
                    // normalArray.push(z);

                    facemap[array[i]] = index++; // set an index to each vertex
                //}

                indexArray.push(facemap[array[i]]); // every three indices give a triangle
                currentGroup[1]++;
            } // read each index in one line
        } // read one line
    } // read all lines
    facemap = {};
    for(var i = 0; i< triangles.length; i+= 1){
        cur_tri = triangles[i];
        //onsole.log(cur_tri);
        cur_array = cur_tri.vertices;
        
        for (var j = 0; j < 3; j += 1){
            //if (!(cur_array[j] in facemap)) {
                var vtx, nor, tex;
                vtx = cur_array[j]; //index of point
                nor = vtx;
                tex = vtx;

                var cur_vertex = wevMap[vtx]; //point
                avg_norm = normalize(cur_vertex.vertex_normals);
                avg_normalArray.push(avg_norm[0]);
                avg_normalArray.push(avg_norm[1]);
                avg_normalArray.push(avg_norm[2]);

                facemap[cur_array[j]] = avgindex++;
            //}   
        }
    }


    // set the VBOs
    obj.normalObject = obj.ctx.createBuffer();
    obj.ctx.bindBuffer(obj.ctx.ARRAY_BUFFER, obj.normalObject);
    obj.ctx.bufferData(obj.ctx.ARRAY_BUFFER, new Float32Array(normalArray), obj.ctx.STATIC_DRAW);

    obj.avgnormalObject = obj.ctx.createBuffer();
    obj.ctx.bindBuffer(obj.ctx.ARRAY_BUFFER, obj.avgnormalObject);
    obj.ctx.bufferData(obj.ctx.ARRAY_BUFFER, new Float32Array(avg_normalArray), obj.ctx.STATIC_DRAW);

    obj.texCoordObject = obj.ctx.createBuffer();
    obj.ctx.bindBuffer(obj.ctx.ARRAY_BUFFER, obj.texCoordObject);
    obj.ctx.bufferData(obj.ctx.ARRAY_BUFFER, new Float32Array(textureArray), obj.ctx.STATIC_DRAW);

    obj.vertexObject = obj.ctx.createBuffer();
    obj.ctx.bindBuffer(obj.ctx.ARRAY_BUFFER, obj.vertexObject);
    obj.ctx.bufferData(obj.ctx.ARRAY_BUFFER, new Float32Array(vertexArray), obj.ctx.STATIC_DRAW);

    obj.indexArray = indexArray; obj.wireIndexElements = [];

    obj.numIndices = indexArray.length;
    obj.indexObject = obj.ctx.createBuffer();
    obj.ctx.bindBuffer(obj.ctx.ELEMENT_ARRAY_BUFFER, obj.indexObject);
    obj.ctx.bufferData(obj.ctx.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexArray), obj.ctx.STREAM_DRAW);

    obj.groups = groups;

    obj.loaded = true;
}

//A simple function to download files.
function downloadFile(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
  
    element.style.display = 'none';
    document.body.appendChild(element);
  
    element.click();
  
    document.body.removeChild(element);
  }
  
//A buttom to download a file with the name provided by the user
function downloadFileFunction(){
    // Get the file name from the textbox.
    var file = document.getElementById("filename").value;
    
    // Start file download.
    downloadFile(file, responsetext);
}
function quad(a, b, c, d) {

    var t1 = subtract(vertices[b], vertices[a]);
    var t2 = subtract(vertices[c], vertices[b]);
    var normal = cross(t1, t2);
    normal = vec3(normal);

    points.push(vertices[a]);
    normals.push(normal);
    points.push(vertices[b]);
    normals.push(normal);
    points.push(vertices[c]);
    normals.push(normal);
    points.push(vertices[a]);
    normals.push(normal);
    points.push(vertices[c]);
    normals.push(normal);
    points.push(vertices[d]);
    normals.push(normal);
}


function colorCube()
{
   quad(1, 0, 3, 2);
   quad(2, 3, 7, 6);
   quad(3, 0, 4, 7);
   quad(6, 5, 1, 2);
   quad(4, 5, 6, 7);
   quad(5, 4, 0, 1);
}

//----------------------------------------------------------------------------
// Initialization Event Function
//----------------------------------------------------------------------------
window.onload = function init() {
	// Set up a WebGL Rendering Context in an HTML5 Canvas
	canvas = document.getElementById("gl-canvas");
	gl = canvas.getContext("webgl2"); // basic webGL2 context
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

	// Set up data to drw
	mesh.tris = {};
	mesh.tris.Start = points.length;
	colorCube();
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

    //cube
    obj1 = loadObj(gl, 'https://gist.githubusercontent.com/ruanyyyyyyy/09d432633575e2629dd19eb9411c89b7/raw/ffe71437d33d6c439568ce523303d3defecbeb29/goodhand.obj');
    obj2 = loadObj(gl, 'https://gist.githubusercontent.com/ruanyyyyyyy/09d432633575e2629dd19eb9411c89b7/raw/ffe71437d33d6c439568ce523303d3defecbeb29/venus.obj');
    // //horse simple
    obj3 = loadObj(gl, 'https://gist.githubusercontent.com/ruanyyyyyyy/09d432633575e2629dd19eb9411c89b7/raw/ffe71437d33d6c439568ce523303d3defecbeb29/horse_s.obj');
    
    
    document.getElementById("ButtonT").onclick = function(){flag = true; flagHand=false; flagHorse=false;};
    document.getElementById("ButtonHand").onclick = function(){flagHand = true; flag = false; flagHorse=false;};
    document.getElementById("ButtonHorse").onclick = function(){flagHorse = true; flag = false; flagHand=false};

    document.getElementById("ButtonFlat").onclick = function(){flag_mode = 1;};
    document.getElementById("ButtonSmooth").onclick = function(){flag_mode = 2;};
    document.getElementById("ButtonWire").onclick = function(){flag_mode = 3;};
    document.getElementById("ButtonBoth").onclick = function(){flag_mode = 4;};

	render();
};



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


function bindBuffersToShader(obj) {
    //Bind vertexObject - the vertex buffer for the OBJ - to position attribute
	gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexObject);
	gl.vertexAttribPointer(program.vPosition, 3, gl.FLOAT, gl.FALSE, 0, 0);
	gl.enableVertexAttribArray(program.vPosition);
  
	//repeat for normalObject (3 floats) and textureObject (2 floats) 
    //if they exist and your shader supports them.
    // gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalObject);
	// gl.vertexAttribPointer(program.vNormal, 3, gl.FLOAT, gl.FALSE, 0, 0);
	// gl.enableVertexAttribArray(program.vNormal); 
  
	//j3di.js ignores materials - surface colors - so we'll set a basic one here
	// -- interesting idea: bind normalObject to vColor
	var colors = "normal"; // set to "normal" to visual normals array
	if (colors == "uniform") 
	{
		gl.disableVertexAttribArray(program.vColor);
		gl.vertexAttrib4f(program.vColor, 0.8, 0.8, 0.8, 1.0); // specify colour as necessary
	}
	else
	{
		gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalObject);
		gl.vertexAttribPointer(program.vColor, 3, gl.FLOAT, gl.FALSE, 0, 0);
		gl.enableVertexAttribArray(program.vColor);
	}
	
	//j3di.js stores OBJs as vertex arrays with an element array lookup buffer
	//the buffer describes TRIANGLES with UNSIGNED_SHORT
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexObject);
}

function bindSmoothBuffersToShader(obj) {
    //Bind vertexObject - the vertex buffer for the OBJ - to position attribute
	gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexObject);
	gl.vertexAttribPointer(program.vPosition, 3, gl.FLOAT, gl.FALSE, 0, 0);
	gl.enableVertexAttribArray(program.vPosition);
  
	//repeat for normalObject (3 floats) and textureObject (2 floats) 
    //if they exist and your shader supports them.
    // gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalObject);
	// gl.vertexAttribPointer(program.vNormal, 3, gl.FLOAT, gl.FALSE, 0, 0);
	// gl.enableVertexAttribArray(program.vNormal); 
  
	//j3di.js ignores materials - surface colors - so we'll set a basic one here
	// -- interesting idea: bind normalObject to vColor
	var colors = "normal"; // set to "normal" to visual normals array
	if (colors == "uniform") 
	{
		gl.disableVertexAttribArray(program.vColor);
		gl.vertexAttrib4f(program.vColor, 0.8, 0.8, 0.8, 1.0); // specify colour as necessary
	}
	else
	{
		gl.bindBuffer(gl.ARRAY_BUFFER, obj.avgnormalObject);
		gl.vertexAttribPointer(program.vColor, 3, gl.FLOAT, gl.FALSE, 0, 0);
		gl.enableVertexAttribArray(program.vColor);
	}
	
	//j3di.js stores OBJs as vertex arrays with an element array lookup buffer
	//the buffer describes TRIANGLES with UNSIGNED_SHORT
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexObject);
}


//----------------------------------------------------------------------------
// Creates a wireframe for an OBJ for modified j3d9.js 
// and binds necessary buffers to draw it
//
// To use this function, first add the element index array to the object
// that j3di.js builds. Change j3di.js:507 or a nearby blank line to this:
// obj.indexArray = indexArray; obj.wireIndexElements = [];
//----------------------------------------------------------------------------
function bindWireBuffersToShader(obj)
{
	//Bind vertexObject - the vertex buffer for the OBJ - to position attribute
	gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexObject);
	gl.vertexAttribPointer(program.vPosition, 3, gl.FLOAT, gl.FALSE, 0, 0);
	gl.enableVertexAttribArray(program.vPosition);
  
    //gl.disableVertexAttribArray(program.vNormal);
    //gl.vertexAttrib4f(program.vNormal, 0.0, 0.0, 0.0, 1.0);

	gl.disableVertexAttribArray(program.vColor);
	gl.vertexAttrib4f(program.vColor, 0.0, 0.0, 0.0, 1.0); // specify colour as needed
  
	if (obj.wireIndexElements.length == 0)
	{
		obj.wireIndexElements = TrianglesToWireframe(obj.indexArray);
		obj.wireIndexObject = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.wireIndexObject);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, Uint16Array.from(obj.wireIndexElements), gl.STREAM_DRAW);
	}
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.wireIndexObject);	
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

    if (flag) {
        if (obj1.loaded) {
            var objTrans = mult(mv, translate(-3, -3, 0));
            objTrans = mult(objTrans, translate(0, cubeTranslation, 0));
            objTrans = mult(objTrans, translate(cubeTranslation1, 0, cubeTranslation1));
            objTrans = mult(objTrans,scale(5, 5, 5));
            objTrans = mult(objTrans,scale(cubeZoom,cubeZoom,cubeZoom));
            objTrans = mult(objTrans, rotateX(cubeRotation));
            objTrans = mult(objTrans, rotateZ(cubeRotation*0.7));
            objTrans = mult(objTrans, rotateY(cubeRotation1));
            
            gl.uniformMatrix4fv(program.mv, gl.FALSE, flatten(objTrans));
            
            switch(flag_mode) {
                case 1: // flat
                  //Draw solid OBJ
                  bindBuffersToShader(obj1);
                  gl.drawElements(gl.TRIANGLES, obj1.numIndices, gl.UNSIGNED_SHORT, 0);
                  break;
                case 2: //smooth
                  //Draw solid OBJ
                  bindSmoothBuffersToShader(obj1);
                  gl.drawElements(gl.TRIANGLES, obj1.numIndices, gl.UNSIGNED_SHORT, 0);
                  break;
                case 3:
                    //Draw wire OBJ
                    bindWireBuffersToShader(obj1);
                    gl.drawElements(gl.LINES, obj1.wireIndexElements.length, gl.UNSIGNED_SHORT, 0);
                    break;
                case 4:
                    bindBuffersToShader(obj1);
                    gl.drawElements(gl.TRIANGLES, obj1.numIndices, gl.UNSIGNED_SHORT, 0);
                    bindWireBuffersToShader(obj1);
                    gl.drawElements(gl.LINES, obj1.wireIndexElements.length, gl.UNSIGNED_SHORT, 0);
                    break;
              }
        }
    }

    if (flagHand) {
        if (obj2.loaded) {
            var objTrans = mult(mv, translate(0,1,0));
            objTrans = mult(objTrans, translate(0, cubeTranslation, 0));
            objTrans = mult(objTrans, translate(cubeTranslation1, 0, cubeTranslation1));
            objTrans = mult(objTrans,scale(0.05, 0.05, 0.05));
            objTrans = mult(objTrans,scale(cubeZoom,cubeZoom,cubeZoom));
            objTrans = mult(objTrans, rotateY(30));
            objTrans = mult(objTrans, rotateX(-60));
            objTrans = mult(objTrans, rotateZ(-60*0.7));
            objTrans = mult(objTrans, rotateX(cubeRotation));
            objTrans = mult(objTrans, rotateZ(cubeRotation*0.7));
            objTrans = mult(objTrans, rotateY(cubeRotation1));
            
            gl.uniformMatrix4fv(program.mv, gl.FALSE, flatten(objTrans));
            
            switch(flag_mode) {
                case 1:
                  //Draw solid OBJ
                  bindBuffersToShader(obj2);
                  gl.drawElements(gl.TRIANGLES, obj2.numIndices, gl.UNSIGNED_SHORT, 0);
                  break;
                case 2:
                  //Draw solid OBJ
                  bindSmoothBuffersToShader(obj2);
                  gl.drawElements(gl.TRIANGLES, obj2.numIndices, gl.UNSIGNED_SHORT, 0);
                  break;
                case 3:
                    //Draw wire OBJ
                    bindWireBuffersToShader(obj2);
                    gl.drawElements(gl.LINES, obj2.wireIndexElements.length, gl.UNSIGNED_SHORT, 0);
                    break;
                case 4:
                    bindBuffersToShader(obj2);
                    gl.drawElements(gl.TRIANGLES, obj2.numIndices, gl.UNSIGNED_SHORT, 0);
                    bindWireBuffersToShader(obj2);
                    gl.drawElements(gl.LINES, obj2.wireIndexElements.length, gl.UNSIGNED_SHORT, 0);
                    break;
              }
        }
    }

    if (flagHorse) {
        if (obj3.loaded) {
            var objTrans = mult(mv, translate(0,1,0));
            objTrans = mult(objTrans, translate(0, cubeTranslation, 0));
            objTrans = mult(objTrans, translate(cubeTranslation1, 0, cubeTranslation1));
            objTrans = mult(objTrans,scale(30, 30, 30));
            objTrans = mult(objTrans,scale(cubeZoom,cubeZoom,cubeZoom));
            objTrans = mult(objTrans, rotateX(cubeRotation));
            objTrans = mult(objTrans, rotateZ(cubeRotation*0.7));
            objTrans = mult(objTrans, rotateY(cubeRotation1));
            
            gl.uniformMatrix4fv(program.mv, gl.FALSE, flatten(objTrans));
            
            switch(flag_mode) {
                case 1:
                  //Draw solid OBJ
                  bindBuffersToShader(obj3);
                  gl.drawElements(gl.TRIANGLES, obj3.numIndices, gl.UNSIGNED_SHORT, 0);
                  break;
                case 2:
                  //Draw solid OBJ
                  bindSmoothBuffersToShader(obj3);
                  gl.drawElements(gl.TRIANGLES, obj3.numIndices, gl.UNSIGNED_SHORT, 0);
                  break;
                case 3:
                    //Draw wire OBJ
                    bindWireBuffersToShader(obj3);
                    gl.drawElements(gl.LINES, obj3.wireIndexElements.length, gl.UNSIGNED_SHORT, 0);
                    break;
                case 4:
                    bindBuffersToShader(obj3);
                    gl.drawElements(gl.TRIANGLES, obj3.numIndices, gl.UNSIGNED_SHORT, 0);
                    bindWireBuffersToShader(obj3);
                    gl.drawElements(gl.LINES, obj3.wireIndexElements.length, gl.UNSIGNED_SHORT, 0);
                    break;
              }
        }
    }
    
    // if (!flag && !flagHand && !flagHorse) {
    //     //Rebind buffers for procedural mesh
    //     gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
    //     gl.vertexAttribPointer( program.vPosition, 4, gl.FLOAT, gl.FALSE, 0, 0 );
    //     gl.enableVertexAttribArray( program.vPosition );
    //     gl.bindBuffer( gl.ARRAY_BUFFER, colorBuffer );
    //     gl.vertexAttribPointer( program.vColor, 4, gl.FLOAT, gl.FALSE, 0, 0 );
    //     gl.enableVertexAttribArray( program.vColor );

        
    //     mv = mult(mv, rotate(roty,vec3(0,1,0)));
    //     roty+= 0.5;
    //     mv = mult(mv, translate(-3, 0, -3));
    //     mv = mult(mv, scale(6, 6, 6));


    //     //Animate the mesh and copy the updated data to gl buffers
    //     updateHeightsAndColors(time);
    //     gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
    //     gl.bufferSubData( gl.ARRAY_BUFFER, 0, flatten(points) );
    //     gl.bindBuffer( gl.ARRAY_BUFFER, colorBuffer );
    //     gl.bufferSubData( gl.ARRAY_BUFFER, 0, flatten(colors) );
        
    //     //Or update time in the shader so it can animate the vertex stream
    //     gl.uniform1f(program.time, time);
        
    //     time += 0.01;

    //     gl.uniformMatrix4fv(program.mv, gl.FALSE, flatten(mv));
    //     gl.drawArrays(gl.TRIANGLES, mesh.tris.Start, mesh.tris.Vertices);

    //     //Wires and points will have solid colour, like a uniform	
    //     //Disabling a vertex attribute array allows it to take on a fixed value, a bit like a uniform
    //     gl.disableVertexAttribArray( program.vColor );

    //     //Set a disabled attribute like this
    //     gl.vertexAttrib4f( program.vColor, 0.0, 0.0, 0.0, 1.0 );

    //     gl.drawArrays(gl.LINES, mesh.wires.Start, mesh.wires.Vertices);

    //     //Renable the vertex attrib array to permit per-vertex colour array to work again
    //     gl.enableVertexAttribArray( program.vColor );
    // }

	
	requestAnimationFrame(render);
}


