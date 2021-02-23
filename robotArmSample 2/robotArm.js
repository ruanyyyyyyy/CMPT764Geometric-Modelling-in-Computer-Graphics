//cylinder adapted from: https://cse.taylor.edu/~jdenning/classes/cos350/slides/08_Cylinders.html

"use strict";

var canvas, gl, program;

var NumVertices = 36; //(6 faces)(2 triangles/face)(3 vertices/triangle)

var points = [];
var colors = [];
var normals = [];
var vertices = [
    vec3( -0.5, -0.5,  0.5),
    vec3( -0.5,  0.5,  0.5),
    vec3(  0.5,  0.5,  0.5),
    vec3(  0.5, -0.5,  0.5),
    vec3( -0.5, -0.5, -0.5),
    vec3( -0.5,  0.5, -0.5),
    vec3(  0.5,  0.5, -0.5),
    vec3(  0.5, -0.5, -0.5)
];

// RGBA colors
var vertexColors = [
    vec4( 1.0, 0.0, 0.0, 1.0 ),  // red
    vec4( 0.0, 0.0, 1.0, 1.0 ),  // blue
];

// Parameters controlling the size of the Robot's arm

var BASE_HEIGHT      = 0.5;
var BASE_WIDTH       = 1.0;
var LOWER_ARM_HEIGHT = 2.0;
var LOWER_ARM_WIDTH  = 0.3;
var UPPER_ARM_HEIGHT = 2.0;
var UPPER_ARM_WIDTH  = 0.3;
var RADIUS = 0.15;

// Shader transformation matrices

var modelViewMatrix, projectionMatrix;

// Array of rotation angles (in degrees) for each rotation axis

var Base = 0;
var LowerArm = 1;
var UpperArm = 2;


var theta= [ 0, 0, 0];

var oldPos, newPos;
var angle = 0;

var modelViewMatrixLoc, normalMatLoc, lightVecLoc;

var vBuffer, cBuffer, nBuffer;

//----------------------------------------------------------------------------
var cube_face_normals = [];
var cylinder_face_normals = [];
var cube_normals = [];
var cyl_normals = [];

// function getCubeNormal() {
//     var normal;
//     for(var i=0; i<vertices.length; i++) {
//         normal = normalize(vertices[i]);
//         cube_normals.push(normal);
//     }
    
// }

const cubeNormals = [
    // Front
    vec3(0.0,  0.0,  1.0),

    // Back
    vec3(0.0,  0.0, -1.0),

    // Top
    vec3(0.0,  1.0,  0.0),

    // Bottom
    vec3(0.0, -1.0,  0.0),

    // Right
    vec3(1.0,  0.0,  0.0),

    // Left
    vec3(-1.0,  0.0,  0.0)
];

function getCylNormal(){
    var normal;
    for(var i=0; i<cyl_vertices.length; i++) {
        var y = cyl_vertices[i][1];
        if (y>0) {
            // normal = normalize(add(vec3(0,1,0), cyl_vertices[i]));
            normal = normalize(cyl_vertices[i]);
        } else {
            normal = normalize(cyl_vertices[i]);
            // normal = normalize(add(vec3(0,-1,0), cyl_vertices[i]));
            // normal = normalize(cyl_vertices[i]);
        }
        cyl_normals.push(normal);
    }
}

function quad(  a,  b,  c,  d, index, normal ) {
    colors.push(vertexColors[index]);
    points.push(vertices[a]);
    normals.push(normal);

    colors.push(vertexColors[index]);
    points.push(vertices[b]);
    normals.push(normal);
    
    colors.push(vertexColors[index]);
    points.push(vertices[c]);
    normals.push(normal);
    
    colors.push(vertexColors[index]);
    points.push(vertices[a]);
    normals.push(normal);
    
    colors.push(vertexColors[index]);
    points.push(vertices[c]);
    normals.push(normal);
    
    colors.push(vertexColors[index]);
    points.push(vertices[d]);
    normals.push(normal);
}


function colorUpperCube() {
    quad( 1, 0, 3, 2, 0, cubeNormals[0]);
    quad( 2, 3, 7, 6, 0, cubeNormals[4]);
    quad( 3, 0, 4, 7, 0, cubeNormals[3]);
    quad( 6, 5, 1, 2, 0, cubeNormals[2]);
    quad( 4, 5, 6, 7, 0, cubeNormals[1]);
    quad( 5, 4, 0, 1, 0, cubeNormals[5]);
}

function colorLowerCube() {
    quad( 1, 0, 3, 2, 1, cubeNormals[0]);
    quad( 2, 3, 7, 6, 1, cubeNormals[4]);
    quad( 3, 0, 4, 7, 1, cubeNormals[3]);
    quad( 6, 5, 1, 2, 1, cubeNormals[2]);
    quad( 4, 5, 6, 7, 1, cubeNormals[1]);
    quad( 5, 4, 0, 1, 1, cubeNormals[5]);
}

var cyl_vertices, cyl_colors;
var alt_colors;
var NumSides = 12;
function buildVertices() {
    var x, z;
    var angle = 0;
    var inc = Math.PI * 2.0 / NumSides;

    cyl_vertices = new Array(NumSides * 2);
    cyl_colors   = new Array(NumSides * 2);

    alt_colors = [[1.0, 0.5, 0.5, 1.0], [0.5, 1.0, 0.5, 1.0], [0.5, 0.5, 1.0, 1.0]];

    for(var i_side = 0; i_side < NumSides; i_side++) {
        x = 0.5 * Math.cos(angle);
        z = 0.5 * Math.sin(angle);

        cyl_vertices[i_side] = vec3(x, 0.5, z);
        cyl_colors[i_side] = alt_colors[i_side%3];

        cyl_vertices[i_side+NumSides] = vec3(x, -0.5, z);
        cyl_colors[i_side+NumSides] = alt_colors[i_side%3];

        angle += inc;
    }
    getCylNormal();
}


function colorCylinder()
{
    buildVertices();

    for(var i_side = 0; i_side < NumSides-1; i_side++) {
        quad_cyl(i_side+1, i_side, NumSides+i_side, NumSides+i_side+1);
    }
    quad_cyl(0, NumSides-1, 2*NumSides-1, NumSides);
}

function quad_cyl(a, b, c, d) 
{
    // We need to parition the quad into two triangles in order for
    // WebGL to be able to render it.  In this case, we create two
    // triangles from the quad indices

    //vertex color assigned by the index of the vertex
    var upperCenter = vec3(0, 0.5, 0);
    var lowerCenter = vec3(0, -0.5, 0);
    var indices = [ a, b, c, a, c, d ];
    var democolors = [ [0,1,0,1], [0,1,0,1], [0,1,0,1], [0,1,0,1], [0,1,0,1], [0,1,0,1] ];

    for ( var i = 0; i < indices.length; ++i ) {
        points.push( cyl_vertices[indices[i]] );
        normals.push( cyl_normals[indices[i]] );
        //colors.push( cyl_colors[indices[i]] );
        colors.push( democolors[i] );
    }
    points.push(cyl_vertices[a]);
    points.push(cyl_vertices[b]);
    points.push(upperCenter);
    normals.push( vec3(0,1,0));
    normals.push( vec3(0,1,0));
    normals.push( vec3(0,1,0));
    points.push(cyl_vertices[c]);
    points.push(cyl_vertices[d]);
    points.push(lowerCenter);
    normals.push( vec3(0,-1,0));
    normals.push( vec3(0,-1,0));
    normals.push( vec3(0,-1,0));
    colors.push( democolors[0] );
    colors.push( democolors[0] );
    colors.push( democolors[0] );
    colors.push( democolors[0] );
    colors.push( democolors[0] );
    colors.push( democolors[0] );
}

// citation: https://github.com/ChenAnno/WebGL-Draw-A-Ball/blob/main/CLASS/practice.js
var sphere_vertices = [];
var sphere_colors = [];
var sphere_indices = [];
var sphere_normals = [];
var divideTimes = 15;
function build_sphere_vertices() {
    
    for (var row = 0; row <= divideTimes; row++) {
        var theta = row * Math.PI / divideTimes - Math.PI / 2; 
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);
        for (var col = 0; col <= divideTimes; col++) {
            var phi = col * 2 * Math.PI / divideTimes - Math.PI; 
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);
            var x = cosTheta * cosPhi;
            var y = cosTheta * sinPhi;
            var z = sinTheta;
            sphere_vertices.push(vec3(x, y, z));
            sphere_normals.push(normalize(vec3(x, y, z)));
            sphere_colors.push(vec4(1,0,0,1));
        }
    }
}

function build_sphere_indices() {
    for (var i = 0; i < divideTimes; i++) {
        for (var j = 0; j < divideTimes; j++) {
            var first = i * (divideTimes + 1) + j;
            var second = first + divideTimes + 1;
            sphere_indices.push(first); 
            sphere_indices.push(second); 
            sphere_indices.push(first + 1); 
    
            sphere_indices.push(first + 1); 
            sphere_indices.push(second); 
            sphere_indices.push(second + 1); 
        }
    }
}
//____________________________________________

// Remmove when scale in MV.js supports scale matrices

function scale4(a, b, c) {
   var result = mat4();
   result[0][0] = a;
   result[1][1] = b;
   result[2][2] = c;
   return result;
}


//--------------------------------------------------

var iBuffer, cSphereBuffer, vSphereBuffer, nSphereBuffer;
var vColor, vPosition, vNormal;

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.8, 1.0, 1.0, 1.0 );
    gl.enable( gl.DEPTH_TEST );

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );

    gl.useProgram( program );

    // getCubeNormal();
    colorCylinder();
    colorUpperCube();
    colorLowerCube();
    build_sphere_vertices();
    build_sphere_indices();
    // Load shaders and use the resulting shader program

    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Create and initialize  buffer objects
    iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(sphere_indices), gl.STATIC_DRAW);

    cSphereBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cSphereBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(sphere_colors), gl.STATIC_DRAW);

    vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    vSphereBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vSphereBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(sphere_vertices), gl.STATIC_DRAW);

    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    vPosition = gl.getAttribLocation( program, "vPosition" );
    // gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );

    vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW );

    vNormal = gl.getAttribLocation( program, "normal" );
    gl.vertexAttribPointer( vNormal, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );

    nSphereBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nSphereBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(sphere_normals), gl.STATIC_DRAW );

    vNormal = gl.getAttribLocation( program, "normal" );
    gl.vertexAttribPointer( vNormal, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );

    

    document.getElementById("slider1").onchange = function(event) {
        theta[0] = event.target.value;
    };
    document.getElementById("slider2").onchange = function(event) {
         theta[1] = event.target.value;
    };
    document.getElementById("slider3").onchange = function(event) {
         theta[2] =  event.target.value;
    };
    
    document.getElementById("fetch").onclick = function(event) {
        // var formData = new FormData(scope.querySelector('position'));
        var old_x = document.getElementById("old_x").value;
        var old_y = document.getElementById("old_y").value;
        var old_z = document.getElementById("old_z").value;
        oldPos = vec3(old_x, old_y, old_z);
        var new_x = document.getElementById("new_x").value;
        var new_y = document.getElementById("new_y").value;
        var new_z = document.getElementById("new_z").value;
        newPos = vec3(new_x, new_y, new_z);
        fetch();
    };

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    normalMatLoc = gl.getUniformLocation(program, "normalMat");
    lightVecLoc = gl.getUniformLocation(program, "lightPos");

    var view, viewProjectionMatrix;
    document.getElementById("views").onchange = function(event) {
        view = event.target.value;
        if (view === "t") {
            // projectionMatrix = ortho(-10, 10, -10, 10, -10, 10);
            var projectionMatrix = ortho(-5, 5, -5, 5, -5, 5);
            // Compute a matrix for the camera            
            var viewMatrix = lookAt([0, 1, 0], [0, 0, 0], [0, 0, -1]);
    
            // Compute a view projection matrix
            viewProjectionMatrix = mult(projectionMatrix, viewMatrix);
            gl.uniform3fv( lightVecLoc,  flatten(vec3(0,4,0)) );
        } else {
            viewProjectionMatrix = ortho(-5, 5, -5, 5, -5, 5);
            gl.uniform3fv( lightVecLoc,  flatten(vec3(10,0,10)) );
        }
        gl.uniformMatrix4fv( gl.getUniformLocation(program, "projectionMatrix"),  false, flatten(viewProjectionMatrix) );
    }
    viewProjectionMatrix = ortho(-5, 5, -5, 5, -5, 5);
    gl.uniform3fv( lightVecLoc,  flatten(vec3(10,0,10)) );
    gl.uniformMatrix4fv( gl.getUniformLocation(program, "projectionMatrix"),  false, flatten(viewProjectionMatrix) );

    render();
}
//----------------------------------------------------------------------------

// citation: https://www.sitepoint.com/delay-sleep-pause-wait/
function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
      currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}

function degrees(radians) {
    var pi = Math.PI;
    return radians * (180/pi);
}

function arctanConvert(tmpTheta, numerator, denominator) {
    if (denominator < 0) {
        tmpTheta += Math.PI;
    } else if (denominator>0 && numerator<0) {
        tmpTheta += 2*Math.PI;       
    }
    return tmpTheta
}

var oldTheta, newTheta;

function computeTheta(pos) {
    pos = subtract(pos, vec3(0, 0.5, 0))

    var baseTheta = Math.atan( pos[2] / pos[0] );
    if (pos[0]<0) {
        baseTheta += Math.PI;
    } else if (pos[0]>0 && pos[2]<0) {
        baseTheta += 2*Math.PI;       
    }
    var polar_pos = length(vec3(pos[0], 0, pos[2]));
    var l = length(pos);
    var gamma = Math.acos(l/ (2*2));
    var lowerTheta = Math.atan( polar_pos / pos[1]) - gamma;
    lowerTheta = arctanConvert(lowerTheta, polar_pos, pos[1])

    var upperTheta = Math.atan( (polar_pos - 2*Math.sin(lowerTheta)) / (pos[1] - 2*Math.cos(lowerTheta)) ) - lowerTheta;
    var numerator = polar_pos - 2*Math.sin(lowerTheta);
    var denominator = pos[1] - 2*Math.cos(lowerTheta);
    upperTheta = arctanConvert(upperTheta, numerator, denominator);
    return vec3(baseTheta, lowerTheta, upperTheta);
}
var fetchOld = true;
var returnOld = false;
var fetchNew = false;
var returnNew = false; 

function fetch() {
    oldTheta = computeTheta(oldPos);
    newTheta = computeTheta(newPos);
    baseTmpTheta = 0;
    lowerTmpTheta = 0;
    upperTmpTheta = 0;
    fetchOld = true;
    returnOld = false;
    fetchNew = false;
    returnNew = false; 
    drawFetchScene();
    
    // fetchOld = false;
    // drawReturnScene();
}

var baseTmpTheta = 0;
var lowerTmpTheta = 0;
var upperTmpTheta = 0;

var sphereModelViewMatrix;
function drawFetchScene() {
    // render
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );   
    if ( ( Math.abs(baseTmpTheta-oldTheta[0]) >= Math.abs(oldTheta[0] / 60) ) && fetchOld) {
        baseTmpTheta += oldTheta[0] / 60;
        lowerTmpTheta += oldTheta[1] / 60;      
        upperTmpTheta += oldTheta[2] / 60;
    } 

    if ( ( Math.abs(baseTmpTheta) >= Math.abs(oldTheta[0] / 60) ) && returnOld) {
        baseTmpTheta -= oldTheta[0] / 60;
        lowerTmpTheta -= oldTheta[1] / 60;      
        upperTmpTheta -= oldTheta[2] / 60;
    } 

    if ( Math.abs(baseTmpTheta-oldTheta[0]) < Math.abs(oldTheta[0] / 60) && fetchOld) {
        fetchOld = false;
        returnOld = true;
    }

    if ( Math.abs(baseTmpTheta) < Math.abs(oldTheta[0] / 60) && returnOld) {
        returnOld = false;
        fetchNew = true;
    }

    if ( ( Math.abs(baseTmpTheta-newTheta[0]) >= Math.abs(newTheta[0] / 60) ) && fetchNew) {
        baseTmpTheta += newTheta[0] / 60;
        lowerTmpTheta += newTheta[1] / 60;      
        upperTmpTheta += newTheta[2] / 60;
    } 

    if ( Math.abs(baseTmpTheta-newTheta[0]) < Math.abs(newTheta[0] / 60) && fetchNew) {
        fetchNew = false;
        returnNew = true;
    }

    if ( ( Math.abs(baseTmpTheta) >= Math.abs(newTheta[0] / 60) ) && returnNew) {
        baseTmpTheta -= newTheta[0] / 60;
        lowerTmpTheta -= newTheta[1] / 60;      
        upperTmpTheta -= newTheta[2] / 60;
    } 

    if ( Math.abs(baseTmpTheta) < Math.abs(newTheta[0] / 60) && returnNew) {
        returnNew = false;
        baseTmpTheta = 0;
        lowerTmpTheta = 0;
        upperTmpTheta = 0;
    }
    
    modelViewMatrix = rotate(-degrees(baseTmpTheta), 0, 1, 0 );
    base();

    modelViewMatrix = mult(modelViewMatrix, translate(0.0, BASE_HEIGHT, 0.0));
    modelViewMatrix = mult(modelViewMatrix, rotate(-degrees(lowerTmpTheta), 0, 0, 1 ));
    lowerArm();

    modelViewMatrix  = mult(modelViewMatrix, translate(0.0, LOWER_ARM_HEIGHT, 0.0));
    // var tmpmodelViewMatrix = modelViewMatrix;
    modelViewMatrix  = mult(modelViewMatrix, rotate(-degrees(upperTmpTheta), 0, 0, 1) );
    upperArm();

    if (fetchOld) {
        sphereModelViewMatrix = translate(oldPos);
    } else if (returnOld || fetchNew) {
        sphereModelViewMatrix = mult(modelViewMatrix, translate(0.0, UPPER_ARM_HEIGHT, 0.0));
        // sphereModelViewMatrix = mult(sphereModelViewMatrix, rotate(-degrees(upperTmpTheta), 0, 0, 1) );
    } else if (returnNew) {
        sphereModelViewMatrix = translate(newPos);
    }
    sphere();
    requestAnimFrame(drawFetchScene);
}

function sphere() {
    var s = scale4(RADIUS, RADIUS, RADIUS);
    var instanceMatrix = mult( translate( 0.0, 0.5*RADIUS, 0.0 ), s);
    var t = mult(sphereModelViewMatrix, instanceMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc,  false, flatten(t) );
    var normalMat = transpose(inverse4(sphereModelViewMatrix));
    gl.uniformMatrix4fv(normalMatLoc,  false, flatten(normalMat) );

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, cSphereBuffer);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    gl.bindBuffer(gl.ARRAY_BUFFER, vSphereBuffer);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer( gl.ARRAY_BUFFER, nSphereBuffer );
    gl.vertexAttribPointer( vNormal, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );

    gl.drawElements(gl.TRIANGLES, sphere_indices.length, gl.UNSIGNED_BYTE, 0);
}

//----------------------------------------------------------------------------

function initBuffer() {
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
    gl.vertexAttribPointer( vNormal, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );
    
}
function base() {
    var s = scale4(BASE_WIDTH, BASE_HEIGHT, BASE_WIDTH);
    var instanceMatrix = mult( translate( 0.0, 0.5 * BASE_HEIGHT, 0.0 ), s);
    var t = mult(modelViewMatrix, instanceMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc,  false, flatten(t) );

    var normalMat = transpose(inverse4(modelViewMatrix));
    gl.uniformMatrix4fv(normalMatLoc,  false, flatten(normalMat) );
    initBuffer();

    gl.drawArrays( gl.TRIANGLES, 0, NumVertices*4);

    
}

//----------------------------------------------------------------------------


function upperArm() {
    var s = scale4(UPPER_ARM_WIDTH, UPPER_ARM_HEIGHT, UPPER_ARM_WIDTH);
    var instanceMatrix = mult(translate( 0.0, 0.5 * UPPER_ARM_HEIGHT, 0.0 ),s);
    var t = mult(modelViewMatrix, instanceMatrix);
    gl.uniformMatrix4fv( modelViewMatrixLoc,  false, flatten(t) );

    var normalMat = transpose(inverse4(modelViewMatrix));
    gl.uniformMatrix4fv(normalMatLoc,  false, flatten(normalMat) );
    initBuffer();

    gl.drawArrays( gl.TRIANGLES, NumVertices*4, NumVertices);
}

//----------------------------------------------------------------------------


function lowerArm()
{
    var s = scale4(LOWER_ARM_WIDTH, LOWER_ARM_HEIGHT, LOWER_ARM_WIDTH);
    var instanceMatrix = mult( translate( 0.0, 0.5 * LOWER_ARM_HEIGHT, 0.0 ), s);
    var t = mult(modelViewMatrix, instanceMatrix);
    gl.uniformMatrix4fv( modelViewMatrixLoc,  false, flatten(t) );

    var normalMat = transpose(inverse4(modelViewMatrix));
    gl.uniformMatrix4fv(normalMatLoc,  false, flatten(normalMat) );
    initBuffer();

    gl.drawArrays( gl.TRIANGLES, NumVertices*5, NumVertices);
}

//----------------------------------------------------------------------------


var render = function() {

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

    

    modelViewMatrix = rotate(theta[Base], 0, 1, 0 );
    base();
    

    modelViewMatrix = mult(modelViewMatrix, translate(0.0, BASE_HEIGHT, 0.0));
    modelViewMatrix = mult(modelViewMatrix, rotate(theta[LowerArm], 0, 0, 1 ));
    lowerArm();

    modelViewMatrix  = mult(modelViewMatrix, translate(0.0, LOWER_ARM_HEIGHT, 0.0));
    modelViewMatrix  = mult(modelViewMatrix, rotate(theta[UpperArm], 0, 0, 1) );
    upperArm();

    requestAnimFrame(render);
}

