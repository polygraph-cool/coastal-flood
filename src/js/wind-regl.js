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

let floodingData, geoData, floodedByYear;

const selector = '#wind-main__chart';
const $wrap = document.querySelector(selector);

const regl = initREGL($wrap)

let width,
  height,
  projection;

let $svg,
  $labels;

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
  longestCounty;

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

  loadData(['nj_gridded_wind.csv']).then(([d]) => {
  /*  let maxTotal = d.reduce((sum, e) => sum + parseFloat(e.impactedem33), 0);

    let kt18 = sumArray(d, e => parseFloat(e.impactedkt18));
    let em18 = sumArray(d, e => parseFloat(e.impactedem18)) - kt18;
    let em23 = sumArray(d, e => parseFloat(e.impactedem23)) - (kt18 + em18);
    let em28 = sumArray(d, e => parseFloat(e.impactedem28)) - (kt18 + em18 + em23);
    let em33 = sumArray(d, e => parseFloat(e.impactedem33)) - (kt18 + em18 + em23 + em28);

    floodedByYear = {
      kt18,
      em18,
      em23,
      em28,
      em33
    }
*/
    //floodingData = d;
    geoData = d.reduce((obj, e) => {
      obj[e.period] = obj[e.period] || { 
        'type': 'FeatureCollection',
        'features': [] 
      };

      obj[e.period].features.push({
        "type": "Feature",
        "properties": {
          "value": +e.expected_annual_exposure_to_hurricane_force_winds
        },
        "geometry": {
          "type": "Point",
          "coordinates": [+e.lon, +e.lat]
        }
      });

      return obj;
    }, {}); 

    console.log(geoData);

    constructScene();
  })
}

function constructScene() {
  width = $wrap.getBoundingClientRect().width;
  height = $wrap.getBoundingClientRect().height;

  availableHeight = height - (padding.top + padding.bottom);
  totalWidth = width - padding.left - padding.right;

  /*
  $svg = d3.select(selector).append('svg')
    .attr('width', width)
    .attr('height', height);

  $labels = $svg.selectAll('.county-label')
    .data(sortedCounties)
    .enter()
    .append('text')
    .text(d => d.situs_county)
    .classed('county-label', true)
    .attr('text-anchor', 'end')
    .attr('x', padding.left + 10)
    .style('opacity', 0)
    .style('pointer-events', 'none')
    .attr('y', (d, i) => padding.top + (barHeight * i) + (barHeight / 2))
    .style('fill', 'white');
  */

  nPoints = geoData[Object.keys(geoData)[0]].features.length;
  pointWidth = 2;

  projection = d3.geoAlbers()
    .fitSize([width, height - 200], geoData[Object.keys(geoData)[0]]);

  points = createPoints(nPoints);

  poses = [
    mapLayout1979,
    mapLayout2018,
    mapLayout2055
  ];
  
  currentPose = 0;

  poses[currentPose](points);

  document.body.addEventListener('click', function() {
    animateToPose(currentPose + 1);
  })

  //const drawPoints = getDrawPoints(points);

  animateToPose(0, 0);

  initialized = true;
}




function animateToPose(poseNum, duration=1000) {
  const delayByIndex = 600 / points.length;  

  currentPose = poseNum;
  points.forEach(point => {
    point.sx = point.tx,
    point.sy = point.ty,
    point.pointWidthStart = point.pointWidthEnd;
    point.colorStart = point.colorEnd;
  })

  poses[currentPose](points);

  points.forEach(point => {
    point.tx = point.x,
    point.ty = point.y,
    point.pointWidthEnd = point.width;
    point.colorEnd = point.color;
  })

  const drawPoints = createDrawPoints(points);

  // start an animation loop
  let startTime = null; // in seconds
  const frameLoop = regl.frame(({ time }) => {
    // keep track of start time so we can get time elapsed
    // this is important since time doesn't reset when starting new animations
    if (startTime === null) {
      startTime = time;
    }

    // clear the buffer
    regl.clear({
      // background color (black)
      color: [0, 0, 0, 0],
      depth: 1,
    });

    // draw the points using our created regl func
    // note that the arguments are available via `regl.prop`.
    drawPoints({
      stageWidth: width,
      stageHeight: height,
      duration,
      startTime,
      delayByIndex,
    });

    if (time - startTime > ((duration + 600) / 1000)) {
      frameLoop.cancel();
      startTime = null;
    }
  });

}

function createDrawPoints(points) {
  return regl({
    frag: `
      // set the precision of floating point numbers
      precision highp float;

      // this value is populated by the vertex shader
      varying vec3 fragColor;

      void main() {
        // gl_FragColor is a special variable that holds the color
        // of a pixel
        gl_FragColor = vec4(fragColor, 1);
      }
    `,
    vert: `
      // per vertex attributes
      attribute vec2 positionStart;
      attribute vec2 positionEnd;
      attribute vec3 colorStart;
      attribute vec3 colorEnd;
      attribute float index;
      attribute float pointWidthStart;
      attribute float pointWidthEnd;

      // variables to send to the fragment shader
      varying vec3 fragColor;

      // values that are the same for all vertices
      uniform float stageWidth;
      uniform float stageHeight;
      uniform float elapsed;
      uniform float duration;
      uniform float delayByIndex;

      float easeCubicInOut(float t) {
        t *= 2.0;
        t = (t <= 1.0 ? t * t * t : (t -= 2.0) * t * t + 2.0) / 2.0;

        if (t > 1.0) {
          t = 1.0;
        }

        return t;
      }

      vec2 normalizeCoords(vec2 position) {
        // read in the positions into x and y vars
        float x = position[0];
        float y = position[1];

        return vec2(
          2.0 * ((x / stageWidth) - 0.5),
          // invert y to treat [0,0] as bottom left in pixel space
          -(2.0 * ((y / stageHeight) - 0.5)));
      }

      void main() {
        // update the size of a point based on the prop pointWidt

        float delay = delayByIndex * index;

        float t;

        if (duration == 0.0) {
          t = 1.0;
        // still delaying before animating
        } else if (elapsed < delay) {
          t = 0.0;
        // otherwise we are animating, so use cubic easing
        } else {
          t = easeCubicInOut((elapsed - delay) / duration);
        }

        gl_PointSize = mix(pointWidthStart, pointWidthEnd, t);
        
        vec2 position = mix(positionStart, positionEnd, t);

        // interpolate and send color to the fragment shader
        fragColor = mix(colorStart, colorEnd, t);

        // gl_Position is a special variable that holds the position
        // of a vertex.
        gl_Position = vec4(normalizeCoords(position), 0.0, 1.0);
      }
    `,

    attributes: {
      positionStart: points.map(d => [d.sx, d.sy]),
      positionEnd: points.map(d => [d.tx, d.ty]),
      colorStart: points.map(d => d.colorStart),
      colorEnd: points.map(d => d.colorEnd),
      pointWidthStart: points.map(d => d.pointWidthStart),
      pointWidthEnd: points.map(d => d.pointWidthEnd),
      index: points.map(d => d.id),
    },

    uniforms: {
      // regl actually provides these as viewportWidth and
      // viewportHeight but I am using these outside and I want
      // to ensure they are the same numbers, so I am explicitly
      // passing them in.
      stageWidth: regl.prop('stageWidth'),
      stageHeight: regl.prop('stageHeight'),
      delayByIndex: regl.prop('delayByIndex'),
      duration: regl.prop('duration'),
      // time in ms since the prop startTime (i.e. time elapsed)
      // note that `time` is passed by regl whereas `startTime`
      // is a prop passed to the drawPoints function.
      elapsed: ({ time }, { startTime = 0 }) => (time - startTime) * 1000,
    },

    // specify the number of points to draw
    count: points.length,

    // specify that each vertex is a point (not part of a mesh)
    primitive: 'points',
  });
}

function createPoints(nPoints) {
  return d3.range(nPoints).map(i => ({
    id: i,
    tx: 0,
    ty: 0,
    pointWidthEnd: 0,
    colorEnd: [0, 0, 0]
  }));
}

function rgbStringToArr(str) {
  str = str.slice(4, str.length - 1);

  return str.split(',').map(e => parseInt(e) / 255)
}

function mapLayout1979(points) {
  return mapLayout(points, '1979_1989');
}

function mapLayout2018(points) {
  return mapLayout(points, '2008_2018');
}

function mapLayout2055(points) {
  return mapLayout(points, '2045_2055');
}

function mapLayout(points, period) {
  let max = Math.max(...Object.keys(geoData).map(key => {
    return Math.max(...geoData[key].features.map(e => e.properties.value));
  }));

  let colorScale = d3.scaleLinear()
    .domain([0, max])
    .range([colors.blue, colors.orange]);

  let sizeScale = d3.scaleLinear()
    .domain([0, max])
    .range([1, 7]);

  return points.map((point, i) => {
    //console.log(geoData)
    //console.log(geoData['1979_1989'])
    let [x, y] = projection(geoData[period].features[i].geometry.coordinates);

    //console.log(x, y)

    let value = geoData[period].features[i].properties.value;

    point.x = x;
    point.y = y + 100;
    point.color = rgbStringToArr(colorScale(value))
    point.width = sizeScale(value)

    return point;
  });
}

function resize() {

}

export default {
  init,
  resize
}
