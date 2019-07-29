import loadData from './load-data';
import enterView from 'enter-view';

let geoData, stormData;

// Whether or not the chart has been animated in
let isVisible = false;

let animationInterval = 100;

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

function coordsToLineGeoJson(coords, strengths, name, date) {
  return {
    "type": "Feature",
    "geometry": {
      "type": "LineString",
      "coordinates": coords
    },
    "properties": {
      "name": name,
      "strengths": strengths,
      "date": date
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
    $normalStormRects,
    $majorStormRects,
    $title;

enterView({
  selector: containerSelector,
  enter: beginAnimation,
  offset: 0.5,
});

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
  let features = [];
  let currentCoords = [];

  let currentName;
  let currentDate;
  let currentYear;
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
        features.push(coordsToLineGeoJson(points, strengths, currentName, currentYear));
      }

      let month = parseInt(cells[0].substring(2, 4));
      let year = parseInt(cells[0].substring(4, 8));

      currentDate = new Date(year, month, 1);

      currentYear = year;

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

function beginAnimation() {
  window.requestAnimationFrame(animationStep);
}

function animationStep() {
  $paths
    .transition()
    .duration(animationInterval)
    .style('opacity', d => {
    let year = d.properties.date;
    if (year > currentAnimationYear) {
      return 0;
    } else {
      return Math.max(0.1, (10 - (currentAnimationYear - year)) / 10);
    }
  })

  currentAnimationYear ++;

  if (currentAnimationYear <= yearRange[1]) {
    setTimeout(() => {
      window.requestAnimationFrame(animationStep);
    }, animationInterval);
  }
}

function constructChart() {
  projection = d3.geoAlbers()
     .translate([0, 0]) 
     .scale([100])
     .rotate([0, 0])
     .parallels([29.5, 45.5]); 

  yearRange = d3.extent(stormData.map(d => d.properties.date));

  currentAnimationYear = yearRange[0];

  colorScale = d3.scaleLinear()
    .domain(yearRange)
    .range(["#ffff8c", "#"]);

  //console.log(colorScale(1990))

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
    .style('stroke', '#2c7bb6')//d => colorScale(d.properties.date))
    .style('opacity', 0)
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