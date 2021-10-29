# A1

## GUI design
`a1q1` is to generate a custom GUI which can render and interact with a simple cube:
![image](https://github.com/ruanyyyyyyy/CMPT764Geometric-Modelling-in-Computer-Graphics/blob/main/a1q1/ProblemStatement/Screen%20Shot%202021-10-28%20at%207.45.08%20PM.png)

To see the effect, just run the index.html file on any modern browser directly. 

This GUI can respond to user inputs and provide the following functions:
- mesh display options: flat shaded, smoothly shaded, wireframe, or shaded with mesh edges displayed.
![image](https://github.com/ruanyyyyyyy/CMPT764Geometric-Modelling-in-Computer-Graphics/blob/main/a1q1/ProblemStatement/Screen%20Shot%202021-10-28%20at%207.45.23%20PM.png)
- allowing rotation, zooming and translation.
- allowing input from and output to a mesh file.

## OBJ parser and winged-edge mesh data structure
Input a triangle mesh given in OBJ format, `a1.js` can store the connectivity and geometric information in the **winged-edge data structure**. (For more information about this well-known data structure, check https://en.wikipedia.org/wiki/Winged_edge)

The input mesh is closed and there are no non-manifold vertices or edges in the mesh. In OBJ format, a mesh is given by a vertex list followed by a face list. Each line in the vertex list starts with the character 'v', followed by the x, y, and z vertex coordinates. Each line in the face list starts with the character 'f', and followed by three integers indexing into the vertex list. The vertex indexes start with 1 and are given in counterclockwise order, viewed from the tip of the triangle's outward pointing normal. The first line of the OBJ file is of the form "#n m", where n is the number of vertices and m is the numer of faces in the mesh. Some sample useful OBJ files can be found in the assignment directory:

![image](https://github.com/ruanyyyyyyy/CMPT764Geometric-Modelling-in-Computer-Graphics/blob/main/a1q1/ProblemStatement/Screen%20Shot%202021-10-28%20at%207.45.39%20PM.png)

## Mesh display

Now the mesh can be displayed in various modes in this GUI. The program is able to load and display meshes with up to 50,000 faces reasonably interactively.

# A2 

## Quadric-based mesh decimation

`mc_decimate` implements a mesh decimation algorithm driven by the quadric-based errors, where the outer optimization is implemented using the mulitple choice scheme. The input mesh is assumed to be a connected, closed manifold triangle mesh. Here just implement edge collapse.

The original mesh simplification paper using quadric-based error metrics: http://mgarland.org/files/papers/quadrics.pdf

The paper on the use of the multiple-choice scheme is here: http://www.graphics.rwth-aachen.de/media/papers/mcd_vmv021.pdf

Each vertex stores a sum of quadrics of the supporting planes of its incident triangles. The quadric associated with an edge (u,v) is the sum of quadrics at u and v. Similarily, when an edge (u,v) is collapsed to w, then the quadric assigned to w is the sum of quadrics at u and v. Instead of a priority queue, multiple choice scheme selects the edge collapse amongst k randomly chosen candidate edges which gives the least quadric error. 

`mc_decimate` is built on the WebGL GUI from A1. There is a text field to select the value k, a text field to specify the number of edges to collapse, and a button labeled "Decimate" which will decimate the current mesh in the display window when pressed. This GUI also allows you to output the current mesh obtained by writing it into an OBJ file.

This program can be tested with several moderately large mesh models in OBJ format given here: 
https://www2.cs.sfu.ca/~haoz/teaching/cmpt464/assign/a2/OBJ_files/


# A2 bonus
## Clustering and the K-means algorithm in MATLAB

Function kmeans(x, k, initg) performs k-means clustering on the set of 2D points given by x(an nx2 array). The number of clusters k is given and the array initg supplies the initial clustering. If this argument is ignored, then a random initial clustering is assumed. The function also produces a scatter point plot showing points in different clusters in different colors using MATLAB function **scatter**.

# Credits
This readme document is modified from the assignments description in CMPT764 of Professor Richard Zhang in spring 2021.  