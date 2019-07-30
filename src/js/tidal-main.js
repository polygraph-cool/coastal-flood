import loadData from './load-data';
import * as THREE from 'three';

// Number of rows of boxes;
const BOX_ROWS = 9;
const selector = '#tidal-graphic';

let floodingData;

let $wrap = document.querySelector(selector);

let width,
  height;

let newPropertiesFloodedByYear;

let scene,
  camera,
  geometry,
  material,
  renderer,
  mesh,
  particleGroups,
  light,
  shaderMaterials;

function init() {


  loadData(['tidal.json']).then(([d]) => {
    let maxTotal = d.reduce((sum, e) => sum + parseFloat(e.impactedem33), 0);

    let kt18 = d.reduce((sum, e) => sum + parseFloat(e.impactedkt18), 0);
    let em18 = d.reduce((sum, e) => sum + parseFloat(e.impactedem18), 0) - kt18;
    let em23 = d.reduce((sum, e) => sum + parseFloat(e.impactedem23), 0) - (kt18 + em18);
    let em28 = d.reduce((sum, e) => sum + parseFloat(e.impactedem28), 0) - (kt18 + em18 + em23);
    let em33 = d.reduce((sum, e) => sum + parseFloat(e.impactedem33), 0) - (kt18 + em18 + em23 + em28);

    newPropertiesFloodedByYear = {
      kt18,
      em18,
      em23,
      em28,
      em33
    }

    console.log(newPropertiesFloodedByYear);

    floodingData = d; 
    //console.log((maxTotal / 1000) / BOX_ROWS);
    constructScene();
  })
}

function constructScene() {
  resize(false);

  scene = new THREE.Scene();

  camera = new THREE.OrthographicCamera(
    width, 
    0, 
    0,
    height,
    0.1, 
    1000
  );

  camera.position.set(width / 2, -height / 2, 1);
  camera.lookAt(width / 2, -height / 2, 1000);

  camera.updateProjectionMatrix();

  renderer = new THREE.WebGLRenderer({antialias: true});

  renderer.setClearColor('#0e0d12');

  renderer.setSize(width, height);

  $wrap.appendChild(renderer.domElement);
  
  geometry = new THREE.BufferGeometry();

  geometry.addAttribute('position', getInitialMorph());
  geometry.addAttribute('second', getSecondMorph());

  let texture = new THREE.TextureLoader().load( "/assets/images/coast_01.png" ); //new THREE.TextureLoader().load(createCanvas('#FF0000').toDataURL());

  console.log(texture)

  material = new THREE.ShaderMaterial({
    uniforms: {
      pct: { value: 0.0 },
      size: { value: 1.33 },
      texture: { value: texture },
    },
    transparent: true,
    vertexShader: document.getElementById( 'vertexShader' ).textContent,
    fragmentShader: document.getElementById( 'fragmentShader' ).textContent
  });

  mesh = new THREE.Points( geometry, material );
  mesh.rotation.set(0, 0, 0);
  
  scene.add(mesh);

  light = new THREE.PointLight(0xFFFFFF, 1, 500);
  light.position.set(10, 0, 25);

  scene.add(light);
  

  var geometry = new THREE.BoxGeometry( 20, 20, 20 );
  var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
  var cube = new THREE.Mesh( geometry, material );
  cube.position.x = 10;
  cube.position.y = 10;
  cube.position.z = 10;
  scene.add( cube );
  

  renderScene();
}

function getInitialMorph() {
  let nPoints = Object.values(newPropertiesFloodedByYear).reduce((sum, e) => sum + e, 0);
  let points = new Float32Array( nPoints * 3 );

  const N_DOTS_PER_BOX = 1000;
  const BOX_SIDE = 50;
  const BOX_GAP = 5;

  let totalHeight = (BOX_ROWS * (BOX_SIDE + BOX_GAP)) - BOX_GAP;
  let totalWidth = (Math.ceil((nPoints / 1000) / BOX_ROWS) * (BOX_SIDE + BOX_GAP)) - BOX_GAP;

  for (let i = 0; i < nPoints; i++) {
    let boxNum = Math.floor(i / N_DOTS_PER_BOX);
    let col = Math.floor(boxNum / BOX_ROWS);
    let row = boxNum - (col * BOX_ROWS);

    let minY = row * (BOX_SIDE + BOX_GAP);
    let maxY = minY + BOX_SIDE;

    let minX = col * (BOX_SIDE + BOX_GAP);
    let maxX = minX + BOX_SIDE;

    points[ i * 3 + 0 ] = (Math.random() * (maxX - minX)) + minX - totalWidth / 2;
    points[ i * 3 + 1 ] = (Math.random() * (maxY - minY)) + minY - totalHeight / 2;
    points[ i * 3 + 2 ] = 10 + Math.random();
  }

  return new THREE.BufferAttribute(points, 3);
}

function getSecondMorph() {
  let nPoints = Object.values(newPropertiesFloodedByYear).reduce((sum, e) => sum + e, 0);
  let points = new Float32Array( nPoints * 3 );

  for (let i = 0; i < nPoints; i++) {

    points[ i * 3 + 0 ] = i;
    points[ i * 3 + 1 ] = i;
    points[ i * 3 + 2 ] = 1;
  }

  return new THREE.BufferAttribute(points, 3);
}

function createCanvas (color) {
  var canvas = document.createElement('canvas');
  canvas.setAttribute('height', 2);
  canvas.setAttribute('width', 2);
  var ctx = canvas.getContext('2d');
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 2, 2);

  return canvas;
}

function renderScene() {
  mesh.rotation.z = 0;
  mesh.rotation.y = 0;
  mesh.rotation.x = 0;

  renderer.render( scene, camera );
}



function resize(render=true) {
  width = $wrap.getBoundingClientRect().width;
  height = $wrap.getBoundingClientRect().height;

  if (render) {
    renderScene();
  }
}

export default {
  init,
  resize
}