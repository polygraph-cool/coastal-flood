import loadData from './load-data';
import TWEEN from '@tweenjs/tween.js';
import * as THREE from 'three';

let tweenValues = {
  morph: 0
}

// Number of rows of boxes;
const BOX_ROWS = 9;
const selector = '#tidal-graphic';

let floodingData, geoData;

let $wrap = document.querySelector(selector);

let width,
  height;

let newPropertiesFloodedByYear;

let firstMorphPoints = {};
let secondMorphPoints = {};
let thirdMorphPoints = {};

let scene,
  camera,
  renderer,
  particleGroups,
  light,
  materials,
  meshes,
  geometries,
  projection;

function init() {


  loadData(['tidal.json', 'flooded_properties.json']).then(([d, f]) => {
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
    geoData = f; 
    //console.log((maxTotal / 1000) / BOX_ROWS);
    constructScene();
  })
}

function constructScene() {
  projection = d3.geoAlbers()
    .translate([-2600, 500]) 
    .scale([12500])
    .rotate([90, 0])
    .parallels([29.5, 45.5]);

  resize(false);

  console.log(projection(geoData.features[0].geometry.coordinates)) 

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
  
  geometries = Object.keys(newPropertiesFloodedByYear).map(key => {
    let geometry = new THREE.BufferGeometry();

    let nPoints = newPropertiesFloodedByYear[key];

    geometry.addAttribute('position', getFirstPose(key, nPoints));
    geometry.addAttribute('second', getSecondPose(key, nPoints));

    return geometry;
  })

  material = new THREE.ShaderMaterial({
    uniforms: {
      pct: { value: 0.0 },
      size: { value: 1.33 },
    },
    transparent: true,
    vertexShader: document.getElementById( 'vertexShader' ).textContent,
    fragmentShader: document.getElementById( 'fragmentShader' ).textContent
  }); 

  meshes = geometries.map((geometry, i) => {
    let mat = materials[i];

    let mesh = new THREE.Points( geometry, mat );
    scene.add(mesh);
    return mesh;
  });

  light = new THREE.PointLight(0xFFFFFF, 1, 500);
  light.position.set(10, 0, 25);

  scene.add(light);

  beginRender();
}

function getFirstPose(key, nPoints) {
  let points = new Float32Array( nPoints * 3 );

  for (let i = 0; i < nPoints; i++) {
    if (key == 'kt18') {
      let [x, y] = projection(geoData.features[i].geometry.coordinates)

      points[ i * 3 + 0 ] = x;
      points[ i * 3 + 1 ] = y;
      points[ i * 3 + 2 ] = 10 + Math.random();
    } else {
      points[ i * 3 + 0 ] = (Math.random() * width) + width / 2 + 5;
      points[ i * 3 + 1 ] = (Math.random() * height) - height / 2;
      points[ i * 3 + 2 ] = 10 + Math.random();
    }
  }

  console.log(points)

  firstMorphPoints[key] = points;

  return new THREE.BufferAttribute(points, 3);
}

function getSecondPose(key, nPoints) {
  let points = new Float32Array( nPoints * 3 );

  const N_DOTS_PER_BOX = 1000;
  const BOX_SIDE = 50;
  const BOX_GAP = 5;

  let totalHeight = (BOX_ROWS * (BOX_SIDE + BOX_GAP)) - BOX_GAP;
  let totalWidth = (12 * (BOX_SIDE + BOX_GAP)) - BOX_GAP;

  for (let i = 0; i < nPoints; i++) {
    if (key == 'kt18') {
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
    } else {
      points[ i * 3 + 0 ] = (Math.random() * width) + width / 2 + 5;
      points[ i * 3 + 1 ] = (Math.random() * height) - height / 2;
      points[ i * 3 + 2 ] = 10 + Math.random();
    }
  }

  secondMorphPoints[key] = points;

  return new THREE.BufferAttribute(points, 3);
}

function getThirdPose() {
    let points = new Float32Array( nPoints * 3 );

  const N_DOTS_PER_BOX = 1000;
  const BOX_SIDE = 50;
  const BOX_GAP = 5;

  let totalHeight = (BOX_ROWS * (BOX_SIDE + BOX_GAP)) - BOX_GAP;
  let totalWidth = (12 * (BOX_SIDE + BOX_GAP)) - BOX_GAP;

  for (let i = 0; i < nPoints; i++) {
    if (key == 'em18') {
      let idx = i + newPropertiesFloodedByYear.kt18;

      let boxNum = Math.floor(idx / N_DOTS_PER_BOX);
      let col = Math.floor(boxNum / BOX_ROWS);
      let row = boxNum - (col * BOX_ROWS);

      let minY = row * (BOX_SIDE + BOX_GAP);
      let maxY = minY + BOX_SIDE;

      let minX = col * (BOX_SIDE + BOX_GAP);
      let maxX = minX + BOX_SIDE;

      points[ i * 3 + 0 ] = (Math.random() * (maxX - minX)) + minX - totalWidth / 2;
      points[ i * 3 + 1 ] = (Math.random() * (maxY - minY)) + minY - totalHeight / 2;
      points[ i * 3 + 2 ] = 10 + Math.random();
    } else {
      points[ i * 3 + 0 ] = secondMorphPoints[key][ i * 3 + 0 ];
      points[ i * 3 + 1 ] = secondMorphPoints[key][ i * 3 + 1 ];
      points[ i * 3 + 2 ] = secondMorphPoints[key][ i * 3 + 2 ];
    }
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

function beginRender() {
  window.requestAnimationFrame(renderScene)
}

function renderScene() {
  TWEEN.update();

  renderer.render( scene, camera );

  window.requestAnimationFrame(renderScene)
}

window.updateMorph = function(val) {
  let newTweenValues = {
    morph: val,
  }

  let transitionTween = new TWEEN
    .Tween(tweenValues)
    .to(newTweenValues, 1500)
    .easing(TWEEN.Easing.Cubic.Out);

  transitionTween.onUpdate(function(){
    materials.forEach(mat => {
      mat.uniforms.pct.value = tweenValues.morph;
      mat.uniforms.needsUpdate = true;
    });
  });

  transitionTween.start();
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