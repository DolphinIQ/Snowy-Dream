
let fogWindShader = {
	
	DEFINES: {
		
	},
	
	uniforms: {
		tDiffuse: {type: "t", value:  null},
		uWind: {type: "t", value:  null},
		uTime: {type: "f", value:  null},
		uSunScreenPos: { type: "vec2", value: null },
	},
	
	vertexShader: `
		varying vec2 vUv;
		
		void main(){
			vUv = uv;
			
			gl_Position = modelViewMatrix * projectionMatrix * vec4( position , 1.0 );
		}
	`,
	
	fragmentShader: `
		uniform sampler2D tDiffuse;
		uniform sampler2D uWind;
		uniform float uTime;
		uniform vec2 uSunScreenPos;
		
		varying vec2 vUv;
		
		void main(){
			
			// WIND
			
			vec3 col = texture2D( tDiffuse , vUv ).rgb;
			vec3 windCol = texture2D( uWind , vUv - vec2( uTime*0.3 , 0.0 ) ).rgb;
			col = mix( col , windCol , 0.1 );
			
			
			// SUNLIGHT
			
			float d = 1.0 - distance( uSunScreenPos , vUv );
			d = max( d , 0.0 );
			// col += vec3( d * 0.8 , d * 0.3 , d * 0.5 )*0.2;
			
			gl_FragColor = vec4( col , 1.0 );
		}
	`,
}