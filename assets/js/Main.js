/* 
THREE.js r101 
*/

// Global Variables
let canvas = document.getElementById("myCanvas");
let camera0, scene0, renderer, controls, clock, stats;
let composer, windPass, time = 0;
let textureLoader, gltfLoader;
let Textures = {
	particle: null,
	wind: null,
};
let Lights = [];
let shadows = false;

let snowParticles, particleCount = 5000, range = 50;

function init() {
	// Renderer
	renderer = new THREE.WebGLRenderer( { canvas: canvas, antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.physicallyCorrectLights = true;
	if(shadows){ 
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.shadowMap.autoUpdate = false;
	}
	
	// Scene
	scene0 = new THREE.Scene();
	scene0.background = new THREE.Color( 0xe0e0e0 );
	scene0.fog = new THREE.FogExp2( 0xe0e0e0 , 0.030 );
	// scene0.fog = new THREE.Fog( 0xf0f0f0 , 1 , 100 );
	
	// Camera
	camera0 = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 65 );
	camera0.position.set( 0 , 5 , 100 );
	
	// Clock
	clock = new THREE.Clock();
	
	//Stats
	stats = new Stats();
	document.body.appendChild( stats.dom );
	
	// Loaders
	textureLoader = new THREE.TextureLoader();
	gltfLoader = new THREE.GLTFLoader();

	// Resize Event
	window.addEventListener("resize", function(){
		renderer.setSize( window.innerWidth, window.innerHeight );
		camera0.aspect = window.innerWidth / window.innerHeight;
		camera0.updateProjectionMatrix();
	}, false);
	
	// Inits
	initControls();
	initTextures();
	
	initLights();
	loadModels();
	initSnowParticles();
	initPostProcessing();
	
	if( shadows ) renderer.shadowMap.needsUpdate = true;
}

let loadModels = function(){
	
	gltfLoader.load( 
	// 'assets/models/snowy_verCol.glb', 
	'assets/models/snowy_trees.glb', 
	function( gltf ){
		
		console.log( gltf );
		
		gltf.scene.traverse( function(node){
			
			/* if( node instanceof THREE.Mesh ){
				node.castShadow = true;
				node.receiveShadow = true;
			} */
			
			if( node.name.includes('PineTree') ){
				node.rotation.y = Math.random()* 360 *Math.PI/180;
			}
		});
		
		
		// gltf.scene.getObjectByName('Terrain').material.vertexColors = THREE.FaceColors;
		gltf.scene.getObjectByName('Terrain').castShadow = false;
		gltf.scene.getObjectByName('Terrain').receiveShadow = true;
		gltf.scene.getObjectByName('River').material.opacity = 0.8;
		gltf.scene.getObjectByName('River').material.color = new THREE.Color( 0.55 , 0.75 , 1.0 );
		gltf.scene.getObjectByName('River').castShadow = false;
		// gltf.scene.getObjectByName('River').receiveShadowShadow = false;
		// gltf.scene.remove( gltf.scene.getObjectByName('River') );
		gltf.scene.scale.multiplyScalar( 2.0 );
		
		
		
		
		scene0.add( gltf.scene );
		if( shadows ) renderer.shadowMap.needsUpdate = true;
	} );
}

let initSnowParticles = function(){
	
	let geometry = new THREE.BufferGeometry();
	let posArr = [];
	let velArr = [];
	
	let speed = 2.0;
	let cPos = camera0.position;
	
	for( var i = 0; i < particleCount; i++ ){
		
		let x = Math.random() * range - range/2 + cPos.x;
		let y = Math.random() * range + cPos.y;
		let z = Math.random() * range - range/2 + cPos.z - range/4;
		posArr.push( x , y , z );
		
		
		x = Math.random() * speed*4.0 + speed/2;
		y = ( Math.random() * speed/2 + speed ) * -1;
		z = Math.random() * speed - speed/2;
		
		velArr.push( x , y , z );
	}
	geometry.addAttribute( 'position' , new THREE.Float32BufferAttribute( posArr , 3 ) );
	geometry.addAttribute( 'velocity' , new THREE.Float32BufferAttribute( velArr , 3 ) );
	
	let material = new THREE.PointsMaterial({
		color: 0xffffff,
		size: 0.3,
		// size: 10,
		map: Textures.particle,
		transparent: true,
		alphaTest: 0.7,
		sizeAttenuation: true,
	});
	
	snowParticles = new THREE.Points( geometry , material );
	snowParticles.frustumCulled = false;
	scene0.add( snowParticles );
}

let moveParticles = function( delta ){
	
	if( snowParticles instanceof THREE.Points ){
		let pos = snowParticles.geometry.attributes.position;
		let vel = snowParticles.geometry.attributes.velocity;
		let cPos = camera0.position;
		
		for( let i = 0; i < particleCount; i++ ){
			
			if( pos.getY( i ) <= -1.0 ){ // reset
				pos.setX( i , Math.random() * range - range/2 + cPos.x );
				pos.setY( i , Math.random() * range + cPos.y );
				pos.setZ( i , Math.random() * range - range/2 + cPos.z - range/4 );
				continue;
			}
			
			pos.setXYZ( 
				i , 
				( vel.getX(i) * delta ) + pos.getX(i),
				( vel.getY(i) * delta ) + pos.getY(i),
				( vel.getZ(i) * delta ) + pos.getZ(i),
			)
		}
		
		pos.needsUpdate = true;
	}
}

let initPostProcessing = function(){
	composer = new THREE.EffectComposer( renderer );
	
	// Passes
	let renderPass = new THREE.RenderPass( scene0, camera0 );
	windPass = new THREE.ShaderPass( fogWindShader );
	let fxaaPass = new THREE.ShaderPass( THREE.FXAAShader );
	
	windPass.uniforms.uWind.value = Textures.wind;
	
	composer.addPass( renderPass );
	composer.addPass( windPass );
	composer.addPass( fxaaPass );
	
	fxaaPass.renderToScreen = true;
}

let initLights = function(){
	// Lights[0] = new THREE.AmbientLight( 0xffffdd , 0.2 );
	Lights[0] = new THREE.HemisphereLight( 0xffffdd , 0xffffdd , 0.3 );
	Lights[1] = new THREE.DirectionalLight( 0xffffdd , 2.5 );
	Lights[1].position.set( 5 , 100 , -150 );
	if(shadows){
		Lights[1].castShadow = true;
		Lights[1].shadow.mapSize.width = 1024 * 2;
		Lights[1].shadow.mapSize.height = 1024 * 2;
		Lights[1].shadow.camera.near = 0.1;
		Lights[1].shadow.camera.far = 500;
		if( Lights[1] instanceof THREE.DirectionalLight ){
			Lights[1].shadow.camera.left = -500;
			Lights[1].shadow.camera.bottom = -500;
			Lights[1].shadow.camera.top = 500;
			Lights[1].shadow.camera.right = 500;
		}
		Lights[1].shadow.bias = 0.0005;
	}
	let helper = new THREE.CameraHelper( Lights[1].shadow.camera );
	scene0.add( helper );
	
	Lights[2] = new THREE.DirectionalLight( 0xffffdd , 0.4 );
	Lights[2].position.set( 0 , 30 , 150 );
	
	for(let i = 0; i < Lights.length; i++){
		scene0.add( Lights[i] );
	}
}

let initControls = function(){
	controls = new THREE.OrbitControls( camera0 )
}

let initTextures = function(){
	Textures.particle = textureLoader.load( 'assets/img/particle.png' );
	// Textures.wind = textureLoader.load( 'assets/img/smoke.png' );
	// Textures.wind = textureLoader.load( 'assets/img/fog-seamless.jpg' );
	Textures.wind = textureLoader.load( 'assets/img/fog-seamless-128.jpg' );
	Textures.wind.wrapS = THREE.RepeatWrapping;
	Textures.wind.wrapT = THREE.RepeatWrapping;
}

let screenPosition = function( object ){
	let pos = object.position.clone();
	pos.project( camera0 ); 
	// x € ( -1.0 ; 1.0 ), y € ( -1.0 ; 1.0 )
	// transform to ( 0.0 ; 1.0 )
	pos.x = (pos.x + 1.0)/2.0;
	pos.y = (pos.y + 1.0)/2.0;
	
	return new THREE.Vector2( pos.x , pos.y );
}

function animate() {
	stats.begin();
	let delta = clock.getDelta();
	if( delta > 1 ) delta = 1;
	time += delta ;
	
	windPass.uniforms.uSunScreenPos.value = screenPosition( Lights[1] );
	// console.log( screenPosition( Lights[1] ) );
	windPass.uniforms.uTime.value = time;
	
	moveParticles( delta );
	
	requestAnimationFrame( animate );
	composer.render( scene0, camera0 );
	stats.end();
}

init();
requestAnimationFrame( animate );
