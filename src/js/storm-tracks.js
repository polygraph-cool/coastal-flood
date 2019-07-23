import loadData from './load-data';

let geoData, stormData;

// Whether or not the chart has been animated in
let isVisible = false;

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

function coordsToLineGeoJson(coords, strengths, name) {
  return {
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": coords
    },
    "properties": {
      "name": name,
      "strengths": strengths
    }
  }
}

let corners = {
  tl: [-129.31555556, 57.93166667],
  tr: [-31.04444444, 46.00444444],
  bl: [-114.69583333, 15.87972222],
  br: [-56.29083333, 8.31500000]
}

let basemapBounds = coordsToGeoJson([corners.tl, corners.tr, corners.br, corners.bl]);

// constants
const containerSelector = '#map-svg-wrap';
const barPadding = 5;
const chartTitle = 'Hurricanes in the United States, 1930-2019';

// Scales and measures
let width,
    height,
    projection,
    path,
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
    $normalStormRects,
    $majorStormRects,
    $title;

function init() {
  console.log('init')
  loadData(['us_states_water_boundry.json', 'hurricane_tracks.json']).then(([d, s]) => {
    geoData = d;

    stormData = parseStormData(s);


    console.log(stormData);
    console.log(basemapBounds);
    constructChart();
  })
}

function parseStormData(d) {
  console.log(d.data)

  let features = [];
  let currentCoords = [];

  let currentName;
  let points = [];
  let strengths = [];

  for (let i = 0; i < d.data.length; i++) {
    let line = d.data[i];
    let cells = line.split(',');

    let point = [parseLon(cells[4]), parseLat(cells[3])];
    let strength = parseInt(cells[5]);

    // A line starting with a string like AL152018 (always an A) indicates a new storm
    if (cells[0][0] === 'A') {
      if (points.length > 0) {
        features.push(coordsToLineGeoJson(points, strengths, currentName));
      }

      currentName = cells[1];
      points = [];
      strengths = [];
    } else {
      points.push(point);
      strengths.push(strength);
    }


  }

  return features;
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

  path = d3.geoPath()
    .projection(projection);  

  $container = d3.select(containerSelector);

  $svg = $container.append('svg');

  $g = $svg.append('g');

  //$states = 

  $paths = $g.selectAll('path')
    .data(stormData)
    .enter()
    .append('path')
    .classed('storm-path', true);

  resize();
}

function renderChart() {
  $svg
    .attr('width', width)
    .attr('height', height);

  $paths
    .attr('d', path);
}

function resize() {
  width = $container.node().getBoundingClientRect().width;
  height = $container.node().getBoundingClientRect().height;

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

    let s = padding / (currentWidth / width),
        t = [(width - s * (currentBounds[1][0] + currentBounds[0][0])) / 2, (height - s * 1.01 * (currentBounds[1][1] + currentBounds[0][1])) / 2];

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