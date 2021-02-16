//WebGL context
var gl;

//HTML canvas
var canvas;

//Shader Toy Uniform Locations
var iMouse, iTime, iResolution;

//Interaction support variables
var myX, myY, motion = false;

//Geometry - just two triangles that should fill the whole canvas
var screen = quad2d(vec2(1,1), vec2(-1,1), vec2(-1,-1), vec2(1,-1));

function quad2d(p1, p2, p3, p4) {
   var q = [p1, p2, p4, p4, p2, p3];
   return q;
}

window.onload = function init() {
   canvas = document.getElementById("gl-canvas");
   gl = canvas.getContext('webgl2');
   if (!gl) alert("WebGL 2.0 isn't available");
   
   gl.enable(gl.BLEND);

   program = initShaders(gl, "LE3.vert", "LE3_ShaderPlay.frag");
   gl.useProgram(program);

   //////////////////////
   //Load a canvas sized rectangle to draw on
   var positions = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, positions);
   gl.bufferData(gl.ARRAY_BUFFER, flatten(screen), gl.STATIC_DRAW);
   var vPosition = gl.getAttribLocation(program, "vPosition");
   gl.enableVertexAttribArray(vPosition);
   gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, gl.FALSE, 0, 0);


   //////////////////////
   //Initialize shader uniforms
   iResolution = gl.getUniformLocation(program,"iResolution");//for sending real gl draw buffer dimensions
   resize(canvas); //sets canvas to match window dimensions, updates viewport and iResolution uniform
   
   iTime = gl.getUniformLocation(program,"iTime"); //for sending time since start of app (in seconds)
   startTime = new this.Date().getTime()-60*1000; //used to calculate time since start of app (fudged by 1 minute so we don't start with iTime == 0)
      
   iMouse = gl.getUniformLocation(program,"iMouse"); //for sending mouse positions
   //no one has clicked yet, so set iMouse to center of canvas
   myX = canvas.width/2;
   myY = canvas.height/2;
   gl.uniform2f(iMouse, myX, myY);
   
   
   //////////////////////
   //Event responders

   //Set up some interaction
   //mouse drag
   canvas.onmousedown = startDrag;
   canvas.onmousemove = moveDrag;
   canvas.onmouseup = endDrag;

   //touchscreen drag for mobile
   canvas.ontouchstart = startTouch;
   canvas.ontouchend = endTouch;
   canvas.ontouchmove = moveTouch;
   
   requestAnimationFrame(render);
};

function render() {
   //since this is a full screen app, resize every frame in case someone resized the window
   resize(canvas); 

   gl.clear(gl.COLOR_BUFFER_BIT);

   //update iTime uniform
   var now = new Date();
   var timeSinceStart = (now.getTime() - startTime)/1000.0;
   gl.uniform1f(iTime,timeSinceStart);

   //Draw a rectangle over the whole canvas. We will be shading this.
   gl.drawArrays(gl.TRIANGLES, 0, screen.length);
   requestAnimationFrame(render);
}


//resize function based on point 4 here: https://webgl2fundamentals.org/webgl/lessons/webgl-anti-patterns.html
function resize(canvas) {
   // Lookup the size the browser is displaying the canvas.
   var displayWidth  = canvas.clientWidth;
   var displayHeight = canvas.clientHeight;

   // Check if the canvas is not the same size.
   if (canvas.width  !== displayWidth ||
       canvas.height !== displayHeight) {

     // Make the canvas the same size
     canvas.width  = displayWidth;
     canvas.height = displayHeight;
     gl.viewport(0,0,canvas.width, canvas.height);
     gl.uniform2f(iResolution, gl.drawingBufferWidth, gl.drawingBufferHeight);

   }
 }
 

//Mouse motion handlers
function startDrag(e)
{
   myX = e.clientX;
   myY = canvas.clientHeight - e.clientY;
   console.log(myY);
   gl.uniform2f(iMouse, myX, myY);
   motion = true;
}

function moveDrag(e)
{
   if(motion)
   {
      myX = e.clientX;
      myY = canvas.clientHeight - e.clientY;
      gl.uniform2f(iMouse, myX, myY);
   }
}

function endDrag(e)
{
   motion = false;
}


//Touch motion handlers
function startTouch(e)
{
   e.preventDefault();
   var touches = e.changedTouches;
 
   myX = touches[0].clientX;
   myY = canvas.clientHeight - touches[0].clientY;
   gl.uniform2f(iMouse, myX, myY);
   motion = true;
}

function endTouch(e)
{
   e.preventDefault();
   var touches = e.changedTouches;

   motion = false;
}

function moveTouch(e)
{
   e.preventDefault();
   var touches = e.changedTouches;

   if(motion)
   {
      myX = touches[0].clientX;
      myY = canvas.clientHeight - touches[0].clientY;
      gl.uniform2f(iMouse, myX, myY);
   }
}