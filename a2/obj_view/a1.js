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
var flagDec = false;
var flag_mode = 1;
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
var kvalue;
var nvalue;


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
    self.edges = []; // array of incident edges
    self.vertex_normals = vec3(0.0, 0.0, 0.0);
    self.triangles = [];
    
} 

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
    self.flat_normals = [];   // a Float32Array; 3 components per triangle <dx,dy,dz>
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
    wireArray = [];

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
    var edges = []; // array of edges [0, 1], [4, 7], .....

    var wevMap = {}; // we: winged edge, v: vertex
    var weeMap = {}; // we: winged edge, e: edge

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
            p.coords = [parseFloat(array[1]), parseFloat(array[2]), parseFloat(array[3])];
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

            triangle.vertices = [p1, p2, p3];

            // calc Normal
            var selectEdge1 = math.subtract(wevMap[p1].coords, wevMap[p2].coords);
            var selectEdge2 = math.subtract(wevMap[p2].coords, wevMap[p3].coords);
            var tempN = math.cross(selectEdge1, selectEdge2)
            var tempL = math.norm(tempN)
            var face_normal = math.divide(tempN, tempL);
            
            //add face_normal to each triangle
            triangle.flat_normals = face_normal;
            //add face_normal to each vertex. Then normalize at the end
            wevMap[p1].vertex_normals = math.add(wevMap[p1].vertex_normals, face_normal);
            wevMap[p2].vertex_normals = math.add(wevMap[p2].vertex_normals, face_normal);
            wevMap[p3].vertex_normals = math.add(wevMap[p3].vertex_normals, face_normal);
            

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
                edges.push(e1);

                wevMap[p1].edges.push(e1);
                wevMap[p2].edges.push(e2);
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
                edges.push(e2);

                wevMap[p2].edges.push(e2);
                wevMap[p3].edges.push(e2);
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
                edges.push(e3);

                wevMap[p3].edges.push(e3);
                wevMap[p1].edges.push(e3);
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
                    normalArray.push(face_normal[0]);
                    normalArray.push(face_normal[1]);
                    normalArray.push(face_normal[2]);

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
                points[vtx].triangles.push(cur_tri);

                tempL = math.norm(cur_vertex.vertex_normals)
                avg_norm = math.divide(cur_vertex.vertex_normals, tempL);
                avg_normalArray.push(avg_norm[0]);
                avg_normalArray.push(avg_norm[1]);
                avg_normalArray.push(avg_norm[2]);

                facemap[cur_array[j]] = avgindex++;

            //}   
        }
        wireArray.push(wevMap[cur_array[0]].coords[0]);
        wireArray.push(wevMap[cur_array[0]].coords[1]);
        wireArray.push(wevMap[cur_array[0]].coords[2]);

        wireArray.push(wevMap[cur_array[1]].coords[0]);
        wireArray.push(wevMap[cur_array[1]].coords[1]);
        wireArray.push(wevMap[cur_array[1]].coords[2]);
        wireArray.push(wevMap[cur_array[1]].coords[0]);
        wireArray.push(wevMap[cur_array[1]].coords[1]);
        wireArray.push(wevMap[cur_array[1]].coords[2]);

        wireArray.push(wevMap[cur_array[2]].coords[0]);
        wireArray.push(wevMap[cur_array[2]].coords[1]);
        wireArray.push(wevMap[cur_array[2]].coords[2]);
        wireArray.push(wevMap[cur_array[2]].coords[0]);
        wireArray.push(wevMap[cur_array[2]].coords[1]);
        wireArray.push(wevMap[cur_array[2]].coords[2]);
        
        wireArray.push(wevMap[cur_array[0]].coords[0]);
        wireArray.push(wevMap[cur_array[0]].coords[1]);
        wireArray.push(wevMap[cur_array[0]].coords[2]);

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

    obj.wireObject = obj.ctx.createBuffer();
    obj.ctx.bindBuffer(obj.ctx.ARRAY_BUFFER, obj.wireObject);
    obj.ctx.bufferData(obj.ctx.ARRAY_BUFFER, new Float32Array(wireArray), obj.ctx.STATIC_DRAW);

    obj.indexArray = indexArray; 

    obj.numIndices = indexArray.length;
    obj.indexObject = obj.ctx.createBuffer();
    obj.ctx.bindBuffer(obj.ctx.ELEMENT_ARRAY_BUFFER, obj.indexObject);
    obj.ctx.bufferData(obj.ctx.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexArray), obj.ctx.STREAM_DRAW);

    var geometry = new ModelArrays();
    geometry.points = points;
    geometry.edges = edges;
    geometry.triangles = triangles;
    obj.geometry = geometry;

    obj.groups = groups;
    obj.loaded = true;
}

// edge collaspe
// k: multiple choice scheme, select the edge collapse amongst k randomly chosen candidate edges which gives the least quadric error.
// quadric based error
// n:  the number of edges to collapse,
function decimation(obj, k, n) { //FIXME: each time linked to the same point?
    var wepoints = obj.geometry.points; 
    console.log("#points", wepoints.length); // originally, 502
    var weedges = obj.geometry.edges; // [0,1], [5, 7]....
    var wetriangles = obj.geometry.triangles; // 1000
    
    var global_q = [];
    for(var i = 0; i < wepoints.length; i+=1) {
        cur_p = wepoints[i];
        // find all incident triangles. cur_p.triangles
        cur_q = [[0.0, 0.0, 0.0, 0.0],
                 [0.0, 0.0, 0.0, 0.0],
                 [0.0, 0.0, 0.0, 0.0],
                 [0.0, 0.0, 0.0, 0.0]];
        for(var j = 0; j < cur_p.triangles.length; j += 1) {
            cur_tri = cur_p.triangles[j];
            // TODO:calculate new normal using vertices, find each face normal a,b,c
            // cur_verts = cur_tri.vertices;
            // tedge1 = math.subtract(wepoints[cur_verts[0]].coords, wepoints[cur_verts[1]].coords);
            // tedge2 = math.subtract(wepoints[cur_verts[0]].coords, wepoints[cur_verts[2]].coords);
            // tempN = math.cross(tedge1, tedge2);
            // tempL = math.norm(tempN);
            // facenormal =[tempN[0]/tempL, tempN[1]/tempL, tempN[2]/tempL];
            facenormal = cur_tri.flat_normals;
            
            var a = facenormal[0];
            var b = facenormal[1];
            var c = facenormal[2];
            // calculate d with cur_p.coords
            var d = -(a*cur_p.coords[0] + b*cur_p.coords[1] + c*cur_p.coords[2]);
            // calculate error metric matrix
            var qv = [[a*a, a*b, a*c, a*d],
                [a*b, b*b, b*c, b*d],
                [a*c, b*c, c*c, c*d],
                [a*d, b*d, c*d, d*d]];
            cur_q = math.add(cur_q, qv);
        }
        // store the total incident triangles' error metric matrix of this point
        global_q.push(cur_q);
    }
    var divider = [[2.0, 2.0, 2.0, 2.0],
                   [2.0, 2.0, 2.0, 2.0],
                    [2.0, 2.0, 2.0, 2.0],
                    [2.0, 2.0, 2.0, 2.0]];
    for(var repe = 0; repe < n; repe += 1) {
        // find the minimum value among k candidates
        var cur_min = 1000;
        var edgeInd; // edge to collapse
        var targetV;
        var targeto;
        var targetd; 
        var targetQ;
        for(var i = 0; i < k; i += 1) {
            randomInd = Math.floor(Math.random()*weedges.length);
            t1 = weedges[randomInd][0]; //index
            t2 = weedges[randomInd][1];
            newV = math.add(wepoints[t1].coords, wepoints[t2].coords);
            newV = [newV[0]/2, newV[1]/2, newV[2]/2, 1.0];
            
            Q = math.add(global_q[t1],global_q[t2]);
            Q = math.dotDivide(Q, divider);
            
            newVerr = math.multiply(newV, math.multiply(Q, newV));//TODO:
            if(math.isNaN(newVerr)) { console.log("error is NaN!");}
            if(newVerr < cur_min){
                cur_min = newVerr;
                edgeInd = randomInd;
                targetV = [newV[0], newV[1], newV[2]];
                targeto = t1; //index
                targetd = t2;
                targetQ = Q;
            }
        }
        // console.log(cur_min, edgeInd, targeto, targetd);
       
     //TODO: check if the update is correct
        new_V = new PointsData();
        new_V.coords = targetV;
        wepoints.push(new_V);
        newInd = wepoints.length-1
        global_q.push(Q);
        for(var i = 0; i < wepoints[targeto].triangles.length; i+=1) {
            for(var j = 0; j < 3; j+=1) {
                if(wepoints[targeto].triangles[i].vertices[j] == targeto) {
                    wepoints[targeto].triangles[i].vertices[j] = newInd;
                }
            }
            wepoints[newInd].triangles.push(wepoints[targeto].triangles[i]);
        }
        for(var i = 0; i < wepoints[targetd].triangles.length; i+=1) {
            for(var j = 0; j < 3; j+=1) {
                if(wepoints[targetd].triangles[i].vertices[j] == targetd) {
                    wepoints[targetd].triangles[i].vertices[j] = newInd;
                }
            }
            wepoints[newInd].triangles.push(wepoints[targetd].triangles[i]);
        }
        //check if two points are the same in one triangle, if not, add it to newInd triangles.
        for (var i=0; i < wepoints[newInd].triangles.length; i+=1) {
            tempTri = wepoints[newInd].triangles[i];
            tempVerts = tempTri.vertices;
            if(tempVerts[0]==tempVerts[1] || tempVerts[0]==tempVerts[2] || tempVerts[1]==tempVerts[2]){
                wepoints[newInd].triangles.splice(i, 1);
            }
        }

        // remove edges, remove faces from point.triangles
        weedges.splice(edgeInd, 1);
        for(var i = 0; i < weedges.length; i += 1) {
            if(weedges[i][0]==targeto) {
                weedges[i][0] = newInd;
            }
            if(weedges[i][1]==targeto) {
                weedges[i][1] = newInd;
            }
            if(weedges[i][0]==targetd) {
                weedges[i][0] = newInd;
            }
            if(weedges[i][1]==targetd) {
                weedges[i][1] = newInd;
            }
        }
        
    }
    // calculate coords of new vertices
    // change connected edge destination to this new coords
    // repeat n times
    // build new vertexArray, normalArray, avgNormalarray
    // return new obj
    vertexArray = [];
    normalArray = [];
    wireArray = [];
    
    for(var i = 0; i < wetriangles.length; i += 1) {
        verts = wetriangles[i].vertices;
        normals = wetriangles[i].flat_normals; //TODO: normal changed
        for (var j = 0; j < 3; j += 1) {
            var x = wepoints[verts[j]].coords[0];
            var y = wepoints[verts[j]].coords[1];
            var z = wepoints[verts[j]].coords[2];
            vertexArray.push(x);
            vertexArray.push(y);
            vertexArray.push(z);
            
            normalArray.push(normals[0]);
            normalArray.push(normals[1]);
            normalArray.push(normals[2]);

        }
        wireArray.push(wepoints[verts[0]].coords[0]);
        wireArray.push(wepoints[verts[0]].coords[1]);
        wireArray.push(wepoints[verts[0]].coords[2]);

        wireArray.push(wepoints[verts[1]].coords[0]);
        wireArray.push(wepoints[verts[1]].coords[1]);
        wireArray.push(wepoints[verts[1]].coords[2]);
        wireArray.push(wepoints[verts[1]].coords[0]);
        wireArray.push(wepoints[verts[1]].coords[1]);
        wireArray.push(wepoints[verts[1]].coords[2]);

        wireArray.push(wepoints[verts[2]].coords[0]);
        wireArray.push(wepoints[verts[2]].coords[1]);
        wireArray.push(wepoints[verts[2]].coords[2]);
        wireArray.push(wepoints[verts[2]].coords[0]);
        wireArray.push(wepoints[verts[2]].coords[1]);
        wireArray.push(wepoints[verts[2]].coords[2]);
        
        wireArray.push(wepoints[verts[0]].coords[0]);
        wireArray.push(wepoints[verts[0]].coords[1]);
        wireArray.push(wepoints[verts[0]].coords[2]);
    }
    
    obj.vertexObject = obj.ctx.createBuffer();
    obj.ctx.bindBuffer(obj.ctx.ARRAY_BUFFER, obj.vertexObject);
    obj.ctx.bufferData(obj.ctx.ARRAY_BUFFER, new Float32Array(vertexArray), obj.ctx.STATIC_DRAW);

    obj.normalObject = obj.ctx.createBuffer();
    obj.ctx.bindBuffer(obj.ctx.ARRAY_BUFFER, obj.normalObject);
    obj.ctx.bufferData(obj.ctx.ARRAY_BUFFER, new Float32Array(normalArray), obj.ctx.STATIC_DRAW);

    obj.wireObject = obj.ctx.createBuffer();
    obj.ctx.bindBuffer(obj.ctx.ARRAY_BUFFER, obj.wireObject);
    obj.ctx.bufferData(obj.ctx.ARRAY_BUFFER, new Float32Array(wireArray), obj.ctx.STATIC_DRAW);

    return obj

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

	program.vPosition = gl.getAttribLocation(program, "vPosition");
	program.vColor = gl.getAttribLocation(program, "vColor");

	// Get addresses of shader uniforms
	program.p = gl.getUniformLocation(program, "p");
    program.mv = gl.getUniformLocation(program, "mv");

    //cube
    obj1 = loadObj(gl, 'https://www.cs.sfu.ca/~haoz/teaching/cmpt464/assign/a2/OBJ_files/bigsmile.obj');
    obj2 = loadObj(gl, 'https://gist.githubusercontent.com/ruanyyyyyyy/09d432633575e2629dd19eb9411c89b7/raw/ffe71437d33d6c439568ce523303d3defecbeb29/venus.obj');
    // //horse simple
    obj3 = loadObj(gl, 'https://www.cs.sfu.ca/~haoz/teaching/cmpt464/assign/a2/OBJ_files/horse.obj');
    
    
    document.getElementById("ButtonT").onclick = function(){flag = true; flagHand=false; flagHorse=false;};
    document.getElementById("ButtonHand").onclick = function(){flagHand = true; flag = false; flagHorse=false;};
    document.getElementById("ButtonHorse").onclick = function(){flagHorse = true; flag = false; flagHand=false};
    document.getElementById("ButtonDecimate").onclick = function(){flagDec = true;};
    kvalue = parseInt(document.getElementById("kvalue").value);
    nvalue = parseInt(document.getElementById("nvalue").value);

    document.getElementById("ButtonFlat").onclick = function(){flag_mode = 1;};
    document.getElementById("ButtonSmooth").onclick = function(){flag_mode = 2;};
    document.getElementById("ButtonWire").onclick = function(){flag_mode = 3;};
    document.getElementById("ButtonBoth").onclick = function(){flag_mode = 4;};

	render();
};






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
	// gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexObject);
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





function bindWireBuffersToShader(obj)
{
	//Bind vertexObject - the vertex buffer for the OBJ - to position attribute
	gl.bindBuffer(gl.ARRAY_BUFFER, obj.wireObject);
	gl.vertexAttribPointer(program.vPosition, 3, gl.FLOAT, gl.FALSE, 0, 0);
	gl.enableVertexAttribArray(program.vPosition);
  

	gl.disableVertexAttribArray(program.vColor);
	gl.vertexAttrib4f(program.vColor, 0.0, 0.0, 0.0, 1.0); // specify colour as needed
  
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
                  gl.drawArrays(gl.TRIANGLES, 0, obj1.numIndices);
                  break;
                case 2: //smooth
                  //Draw solid OBJ
                  bindSmoothBuffersToShader(obj1);
                  gl.drawArrays(gl.TRIANGLES, 0, obj1.numIndices);
                  break;
                case 3:
                    //Draw wire OBJ
                    bindWireBuffersToShader(obj1);
                    gl.drawArrays(gl.LINES, 0, obj1.numIndices);
                    gl.drawArrays(gl.LINES, obj1.numIndices, obj1.numIndices*2-obj1.numIndices-1);
                    break;
                case 4:
                    bindBuffersToShader(obj1);
                    gl.drawArrays(gl.TRIANGLES, 0, obj1.numIndices);
                    bindWireBuffersToShader(obj1);
                    gl.drawArrays(gl.LINES, 0, obj1.numIndices);
                    gl.drawArrays(gl.LINES, obj1.numIndices, obj1.numIndices*2-obj1.numIndices-1);
                    break;
              }
            if(flagDec) {
                kvalue = parseInt(document.getElementById("kvalue").value);
                nvalue = parseInt(document.getElementById("nvalue").value);
                obj1 = decimation(obj1, kvalue, nvalue);
                flagDec = false;
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
                  gl.drawArrays(gl.TRIANGLES, 0, obj2.numIndices);
                  break;
                case 2:
                  //Draw solid OBJ
                  bindSmoothBuffersToShader(obj2);
                  gl.drawArrays(gl.TRIANGLES, 0, obj2.numIndices);
                  break;
                case 3:
                    //Draw wire OBJ
                    bindWireBuffersToShader(obj2);
                    gl.drawArrays(gl.LINES, 0, obj2.numIndices*2);
                    break;
                case 4:
                    bindBuffersToShader(obj2);
                    gl.drawArrays(gl.TRIANGLES, 0, obj2.numIndices);
                    bindWireBuffersToShader(obj2);
                    gl.drawArrays(gl.LINES, 0, obj2.numIndices*2);
                    break;
            }
            if(flagDec) {
                kvalue = parseInt(document.getElementById("kvalue").value);
                nvalue = parseInt(document.getElementById("nvalue").value);
                obj2 = decimation(obj2, kvalue, nvalue);
                flagDec = false;
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
                  gl.drawArrays(gl.TRIANGLES, 0, Math.floor(obj3.numIndices/2));
                  gl.drawArrays(gl.TRIANGLES, Math.floor(obj3.numIndices/2), obj3.numIndices-Math.floor(obj3.numIndices/2)-1);
                  break;
                case 2:
                  //Draw solid OBJ
                  bindSmoothBuffersToShader(obj3);
                  gl.drawArrays(gl.TRIANGLES, 0, Math.floor(obj3.numIndices/2));
                  gl.drawArrays(gl.TRIANGLES, Math.floor(obj3.numIndices/2), obj3.numIndices-Math.floor(obj3.numIndices/2)-1);
                  break;
                case 3:
                    //Draw wire OBJ
                    bindWireBuffersToShader(obj3);
                    gl.drawArrays(gl.LINES, 0, obj3.numIndices);
                    gl.drawArrays(gl.LINES, obj3.numIndices, obj3.numIndices*2-obj3.numIndices-1);
                    break;
                case 4:
                    bindBuffersToShader(obj3);
                    gl.drawArrays(gl.TRIANGLES, 0, Math.floor(obj3.numIndices/2));
                    gl.drawArrays(gl.TRIANGLES, Math.floor(obj3.numIndices/2), obj3.numIndices-Math.floor(obj3.numIndices/2)-1);
                    bindWireBuffersToShader(obj3);
                    gl.drawArrays(gl.LINES, 0, obj3.numIndices);
                    gl.drawArrays(gl.LINES, obj3.numIndices, obj3.numIndices*2-obj3.numIndices-1);
                    break;
              }
        }
    }

	
	requestAnimationFrame(render);
}


