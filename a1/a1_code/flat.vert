#version 300 es

in  vec4 aPosition;
in  vec3 aNormal;
flat out vec4 vColor;

uniform vec4 uAmbientProduct, uDiffuseProduct, uSpecularProduct;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec4 uLightPosition;
uniform float uShininess;

void main()
{


    vec3 pos = -(uModelViewMatrix * aPosition).xyz;

    //fixed light postion

    vec3 light = uLightPosition.xyz;
    vec3 L = normalize(light - pos);


    vec3 E = normalize(-pos);
    vec3 H = normalize(L + E);

    vec4 NN = vec4(aNormal,0);

    // Transform vertex normal into eye coordinates

    vec3 N = normalize((uModelViewMatrix*NN).xyz);

    // Compute terms in the illumination equation
    vec4 ambient = uAmbientProduct;

    float Kd = max(dot(L, N), 0.0);
    vec4  diffuse = Kd*uDiffuseProduct;

    float Ks = pow( max(dot(N, H), 0.0), uShininess );
    vec4  specular = Ks * uSpecularProduct;

    if( dot(L, N) < 0.0 ) {
	  specular = vec4(0.0, 0.0, 0.0, 1.0);
    }

    gl_Position = uProjectionMatrix * uModelViewMatrix *aPosition;
    vColor = ambient + diffuse +specular;

    vColor.a = 1.0;
}