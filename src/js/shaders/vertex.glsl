precision mediump float;

// default mandatory variables
attribute vec3 aVertexPosition;
attribute vec2 aTextureCoord;
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

// textures matrices
uniform mat4 activeTextureMatrix;
uniform mat4 nextTextureMatrix;

// varyings : notice we've got 3 texture coords varyings
// displacement texture / visible texture / upcoming texture
varying vec3 vVertexPosition;
varying vec2 vTextureCoord; // displacement
varying vec2 vActiveTextureCoord;
varying vec2 vNextTextureCoord;

// custom uniforms
uniform float uTransitionTimer;


void main() {
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);

    // varyings
    // use original texture coords for our displacement
    vTextureCoord = aTextureCoord;
    vActiveTextureCoord = (activeTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
    vNextTextureCoord = (nextTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;

    vVertexPosition = aVertexPosition;
}