import 'intersection-observer';
import scrollama from 'scrollama';
import loadData from './load-data';
const scroller = scrollama();

d3.selectAll('.intro__step__link')
  .on('click', function() {
    let target = this.dataset.target;
    console.log(target)
    let top = d3.select(target).node().offsetTop;

    window.scrollTo({
      top: top,
      behavior: 'smooth'
    })
  })

let imageWidth = 3507;
let imageHeight = 2480;

let corners = {
  tl: [-76.45916667, 43.20055556],
  tr: [-66.54083333, 41.28166667],
  bl: [-77.85416667, 37.99666667],
  br: [-68.57611111, 36.21305556]
}

let basemapBounds = coordsToGeoJson([corners.tl, corners.tr, corners.br, corners.bl]);

let initialized = false;
let steps = {};
let noop = () => {};

d3.selectAll('.intro__step').style('opacity', 0.3)

// setup the instance, pass callback functions
scroller
  .setup({
    step: '.intro__step'
  })
  .onStepEnter(({ element, index, direction }) => {
    let step = element.dataset.step;

    let fn = steps[`${step}Enter`] || noop;

    d3.selectAll('.intro__step')
      .transition()
      .duration(300)
      .style('opacity', function() {
        return this === element ? 1 : 0.3
      })

    if (initialized) {
      fn(direction);
    }
  })
  .onStepExit(({ element, index, direction }) => {
    let step = element.dataset.step;

    let fn = steps[`${step}Exit`] || noop;

    d3.selectAll('.intro__step')


    d3.select('element').transition()
      .duration(300)
      .style('opacity', 0)

    if (initialized) {
      fn(direction);
    }
  });

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

let containerSelector = '.intro'

let countyData, stateData, coastData;

let width,
    height,
    projection,
    path,
    colorScale,
    yearRange,
    currentAnimationYear,
    margins = {
      top: 20,
      right: 50,
      bottom: 20,
      left: 50
    };

// Chart components
let $container,
    $svg,
    $g,
    $states,
    $paths,
    $coast,
    $counties,
    $state,
    $normalStormRects,
    $majorStormRects,
    $title;

function init() {
  loadData([
    'nj_counties.json', 
    'nj_state.json', 
    'new_jersey_coastline.json'
  ]).then(([
    counties, 
    state,
    coast
  ]) => {

    /*
    counties.features.forEach(feature => {
      if (feature.properties.Name !== 'Salem') {
         feature.geometry.coordinates[0].reverse();
      }
     
    })*/

    countyData = counties;
    stateData = state;
    coastData = coast;
    constructChart();
  })
}


function parseLat(str) {
  return parseFloat(str.substring(0, str.length - 1));
}

function parseLon(str) {
  return -parseFloat(str.substring(0, str.length - 1));
}


function constructChart() {
  projection = d3.geoAlbers()
     .translate([0, 0]) 
     .scale([100])
     .rotate([0, 0])
     .parallels([29.5, 45.5]); 

 // yearRange = d3.extent(geoData.map(d => d.properties.date));

 // currentAnimationYear = yearRange[0];

 /* colorScale = d3.scaleLinear()
    .domain(yearRange)
    .range(["#ffff8c", "#"]);
*/
  //console.log(colorScale(1990))

  path = d3.geoPath()
    .projection(projection);  

  $container = d3.select(containerSelector);

  $svg = $container.append('svg');

  $g = $svg.append('g');

  console.log(countyData.features)

  $counties = $g.selectAll('.county')
    .data(countyData.features)
    .enter()
    .append('path')
    .style('fill', 'transparent')
    .style('stroke', 'red')//d => colorScale(d.properties.date))
    .style('opacity', 0)
    .classed('county', true);

  $state = $g.selectAll('.state')
    .data(stateData.features)
    .enter()
    .append('path')
    .style('fill', 'transparent')
    .style('stroke', 'white')//d => colorScale(d.properties.date))
    .style('opacity', 0.4)
    .classed('state', true);

  $coast = $g.selectAll('.coast')
    .data(coastData.features)
    .enter()
    .append('path')
    .style('fill', 'transparent')
    .style('stroke', 'red')//d => colorScale(d.properties.date))
    .style('opacity', 0)
    .classed('coast', true);

  resize();

  initialized = true;
}

steps.coastlineEnter =  function () {
  $coast.attr('stroke-dasharray', function(d) {
      return this.getTotalLength();
    })
    .attr('stroke-dashoffset', function(d) {
      return this.getTotalLength();
    })
    .style('opacity', 1)
    .transition()
    .duration(1000)
    .attr('stroke-dashoffset', function(d) {
      return 0;
    });
}

steps.coastlineExit = function() {
    $coast.transition()
    .duration(1000)
    .attr('stroke-dashoffset', function(d) {
      return -this.getTotalLength();
    });
}

steps.countiesEnter = function() {
  let goodCounties = [
    'Ocean',
    'Cape May',
    'Atlantic',
    'Monmouth',
    'Salem',
    'Burlington',
    'Gloucester',
    'Camden',
    'Cumberland',
    'Middlesex',
    'Hudson',
    'Union',
    'Bergen',
    'Essex',
  ]

  $counties.transition()
    .style('stroke', 'red')
    .style('fill', 'rgba(255, 0, 0, 0.2)')
    .duration(600)
    .delay((d, i) => i * 20)
    .style('opacity', d => {
      return goodCounties.indexOf(d.properties.Name) > -1 ? 1 : 0;
    })
}

steps.countiesExit = function() {
  $counties.transition()
    .duration(600)
    .delay((d, i) => i * 20)
    .style('opacity', 0)
}

steps.finalEnter = function() {
  d3.select('.intro')
    .transition()
    .duration(1000)
    .style('opacity', 1)
}

steps.finalExit = function(direction) {
  d3.select('.intro')
    .transition()
    .duration(1000)
    .style('opacity', direction === 'down' ? 0.2 : 1)
}

function renderChart() {
  $svg
    .attr('width', width)
    .attr('height', height);

  $counties
    .attr('d', path);

  $state
    .attr('d', path);

  $coast
    .attr('d', path);

  setTimeout(function() {
    $state.attr('stroke-dasharray', function(d) {
      return this.getTotalLength();
    })
    .attr('stroke-dashoffset', function(d) {
      return 0 //this.getTotalLength();
    });

  }, 0)
}

function resize() {
  width = $container.node().getBoundingClientRect().width;
  height = $container.node().getBoundingClientRect().height;

  let trueHeight, trueWidth;

  if (height / width > imageHeight / imageWidth) {
    trueHeight = height;
    trueWidth = height * (imageWidth / imageHeight);
  } else {
    trueWidth = width;
    trueHeight = width / (imageWidth / imageHeight);
  }

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

  renderChart();
}

export default {
  init,
  resize
}