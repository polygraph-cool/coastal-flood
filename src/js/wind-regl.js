import loadData from './load-data';
import initREGL from 'regl'; 
import scrollama from 'scrollama';
import { sumArray } from './math-utils';

const scroller = scrollama();

let initialized = false;
/*
// setup the instance, pass callback functions
scroller
  .setup({
    step: '.wind-step'
  })
  .onStepEnter(({ element, index, direction }) => {
    let poseNum = parseInt(element.dataset.pose);

    d3.selectAll('.wind-step')
      .style('opacity', function() {
        if (this === element) {
          return 1;
        } else {
          return 0.3;
        }
      })

    if (initialized && !isNaN(poseNum)) {
      animateToPose(poseNum);
      showCountyLabels(poseNum === 4);
    }
  })
  .onStepExit(response => {
    // { element, index, direction }
  });
*/

let imageWidth = 5314;
let imageHeight = 2480;

let corners = {
  tl: [-78.26638889, 42.21583333],
  tr: [-70.00388889, 40.78222222],
  bl: [-78.97888889, 39.33555556],
  br: [-71.02222222, 37.95972222]
}

let legendLabels = [
  'Greater then 1-in-30',
  'Between 1-in-30 and 1-in-50',
  'Between 1-in-50 and 1-in-100',
  'Between 1-in-100 and 1-in-200',
  'Between 1-in-200 and 1-in-300',
  'Between 1-in-300 and 1-in-500',
  'Less than 1-in-500'
]

function coordsToGeoJson(coords) {
  coords.push(coords[0]); // last coord needs to be the same as the first to be valid
  return {
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [ coords ]
    },
    "properties": { "id": "bbox" },
  }
}

let basemapBounds = coordsToGeoJson([corners.tl, corners.tr, corners.br, corners.bl]);

let d_1980, d_2020;

const selector = '#wind-main__chart';
const $wrap = document.querySelector(selector);

const regl = initREGL($wrap)

let width,
  height,
  projection,
  path;

let $svg,
  $labels,
  $paths_1980,
  $paths_2020,
  $legend;

let points,
  poses,
  currentPose,
  nPoints,
  pointWidth;

let colors = {
  darkGray: [0.5, 0.5, 0.5],
  blue: '#8080F7',
  orange: '#e36f22',  
  red: [227 / 255, 111 / 255, 34 / 255]
}

let startTime = null;

const padding = {top: 100, bottom: 100, left: 300, right: 100}

let sortedCounties,
  nCounties,
  availableHeight,
  barHeight,
  barGap,
  totalWidth,
  longestCounty,
  colorScale = palette(3, 9);

let fns = {
  0: () => {
    $paths_1980
      .transition()
      .duration(1000)
      .style('opacity', 0.8)

     $paths_2020
      .transition()
      .duration(1000)
      .style('opacity', 0)
  },
  1: () => {
    $paths_1980
      .transition()
      .duration(1000)
      .style('opacity', 0)

     $paths_2020
      .transition()
      .duration(1000)
      .style('opacity', 0.8)
  }
}

scroller
  .setup({
    step: '.wind-step'
  })
  .onStepEnter(({ element, index, direction }) => {
    let poseNum = parseInt(element.dataset.pose);

    d3.selectAll('.wind-step')
      .style('opacity', function() {
        if (this === element) {
          return 1;
        } else {
          return 0.3;
        }
      })

    if (initialized && !isNaN(poseNum)) {
      fns[poseNum]();
    }
  });


function palette(min, max) {
    const d = (max-min)/7;
    return d3.scaleThreshold()
        .range(['#f0f17f', '#ecd76c', '#e6bd58', '#dfa445', '#d78a31', '#ce701d', '#c35504'])
        .domain([min + d*1,min + d*2,min + d*3,min + d*4,min + d*5,min + d*6]);
}

function showCountyLabels(visible) {
  $labels.transition()
    .duration(600)
    .delay((d, i) => visible ? 400 + (i * 50) : 0)
    .attr('x', visible ? padding.left - 20 : padding.left + 10)
    .style('opacity', visible ? 1 : 0)
    .style('pointer-events', visible ? 'all' : 'none')
}
 
function init() {
  d3.selectAll('.tidal-step')
      .style('opacity', 0.3)

  loadData(['winds_1980.json', 'winds_2020.json']).then(([w_1980, w_2020]) => {
    d_1980 = w_1980;
    d_2020 = w_2020;

    constructScene();
  })
}

function constructScene() {
  width = $wrap.getBoundingClientRect().width;
  height = $wrap.getBoundingClientRect().height;

  availableHeight = height - (padding.top + padding.bottom);
  totalWidth = width - padding.left - padding.right;

  projection = d3.geoAlbers()
     .translate([0, 0]) 
     .scale([100])
     .rotate([0, 0])
     .parallels([29.5, 45.5]); 

  path = d3.geoPath()
    .projection(projection); 

  updateProjection();

  $svg = d3.select(selector)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('position', 'absolute')
    .style('left', 0)
    .style('overflow', 'visible');

  $legend = $svg.selectAll('g')
    .data(legendLabels)
    .enter()
    .append('g')
    .attr('transform', (d, i) => `translate(-100, ${i * 30 + (height / 2 - 100)})`);

  $legend.append('rect')
    .attr('width', 20)
    .attr('height', 20)
    .style('fill', (d, i) => {
      return colorScale(i + 3);
    })

  $legend.append('text')
    .text(d => d)
    .classed('wind-legend-text', true)
    .attr('x', 30)
    .attr('y', 15)

  $paths_1980 = $svg.selectAll('.path-1980')
    .data(d_1980.features)
    .enter()
    .append('path')
    .classed('path-1980', true)
    .style('opacity', 0.7)
    .style('fill', d => colorScale(d.properties.return_period_bin))

  $paths_2020 = $svg.selectAll('.path-2020')
    .data(d_2020.features)
    .enter()
    .append('path')
    .classed('path-2020', true)
    .style('opacity', 0)
    .style('fill', d => colorScale(d.properties.return_period_bin))

  initialized = true;

  renderChart();
}

function renderChart() {
  $paths_1980.attr('d', path);

  $paths_2020.attr('d', path);
}

function updateProjection() {
  width = $wrap.getBoundingClientRect().width;
  height = $wrap.getBoundingClientRect().height;

  let trueHeight, trueWidth;

  trueHeight = height;
  trueWidth = height * (imageWidth / imageHeight);

  var padding = 1;

  let centroid = [-96, 37.5],//d3.geoCentroid(basemapBounds),
  rotation_target = -centroid[0];

  projection
    .scale(1)
    .center([0, centroid[1]])
    .translate([0,0])
    .rotate([rotation_target,0]);

  let currentBounds = path.bounds(basemapBounds);
  let currentWidth = currentBounds[1][0] - currentBounds[0][0];
  let currentHeight = currentBounds[1][1] - currentBounds[0][1];

  let s = padding / (currentWidth / trueWidth),
      t = [
        ((trueWidth - s * (currentBounds[1][0] + currentBounds[0][0])) / 2) - ((trueWidth - width) / 2), 
        ((trueHeight - s * 1.01 * (currentBounds[1][1] + currentBounds[0][1])) / 2) - ((trueHeight - height) / 2) - 9
      ];

  projection
    .center([0, centroid[1]])
    .scale(s)
    .translate(t);
}

function resize() {

}

export default {
  init,
  resize
}
