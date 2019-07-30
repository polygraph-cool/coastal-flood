import loadData from './load-data';
import * as THREE from 'three';

// Number of rows of boxes;
const BOX_ROWS = 9;
const selector = '#tidal-graphic';

let floodingData;

let $wrap = document.querySelector(selector);

let width,
  height;

let scene,
  camera,
  geometries,
  materials,
  renderer,
  particleGroups,
  light,
  shaderMaterials;

function init() {


  loadData(['tidal.json']).then(([d]) => {
    let maxTotal = d.reduce((sum, e) => sum + parseFloat(e.impactedem33), 0);
    
    floodingData = d;

    //console.log((maxTotal / 1000) / BOX_ROWS);
    constructScene();
  })
}

function constructScene() {
  resize(false);

  scene = new THREE.Scene();

  camera = new THREE.OrthographicCamera(
    width / 2, 
    width / 2, 
    height /2 ,
    height / 2,
    1, 
    1000
  );

  renderer = new THREE.WebGLRenderer({antialias: true});

  renderer.setClearColor('#0e0d12');
  renderer.setSize(width, height);

  $wrap.appendChild(renderer.domElement);


}

function renderScene() {

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