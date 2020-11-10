precision mediump float;

varying vec3 vVertexPosition;
varying vec2 vTextureCoord;
varying vec2 vActiveTextureCoord;
varying vec2 vNextTextureCoord;

// custom uniforms
uniform float uTransitionTimer;

// our textures samplers
// notice how it matches the sampler attributes of the textures we created dynamically
uniform sampler2D activeTexture;
uniform sampler2D nextTexture;
uniform sampler2D displacement;

void main() {
    // our displacement texture
    vec4 displacementTexture = texture2D(displacement, vTextureCoord);

    // slides transitions based on displacement and transition timer
    vec2 firstDisplacementCoords = vActiveTextureCoord + displacementTexture.r * ((cos((uTransitionTimer + 90.0) / (90.0 / 3.141592)) + 1.0) / 1.25);
    vec4 firstDistortedColor = texture2D(activeTexture, vec2(vActiveTextureCoord.x, firstDisplacementCoords.y));

    // same as above but we substract the effect
    vec2 secondDisplacementCoords = vNextTextureCoord - displacementTexture.r * ((cos(uTransitionTimer / (90.0 / 3.141592)) + 1.0) / 1.5);
    vec4 secondDistortedColor = texture2D(nextTexture, vec2(vNextTextureCoord.x, secondDisplacementCoords.y));

    // mix both texture
    vec4 finalColor = mix(firstDistortedColor, secondDistortedColor, 1.0 - ((cos(uTransitionTimer / (90.0 / 3.141592)) + 1.0) / 2.0));

    // handling premultiplied alpha
    finalColor = vec4(finalColor.rgb * finalColor.a, finalColor.a);

    gl_FragColor = finalColor;
}