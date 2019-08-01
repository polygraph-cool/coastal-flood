import loadData from './load-data';
import initREGL from 'regl'; 
import scrollama from 'scrollama';
import { sumArray } from './math-utils';

const scroller = scrollama();

let initialized = false;

// setup the instance, pass callback functions
scroller
  .setup({
    step: '.tidal-step'
  })
  .onStepEnter(({ element, index, direction }) => {
    let poseNum = parseInt(element.dataset.pose);

    d3.selectAll('.tidal-step')
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

let floodingData, geoData, floodedByYear;

const selector = '#tidal-graphic';
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

  loadData(['tidal.json', 'flooded_properties.json']).then(([d, f]) => {
    let maxTotal = d.reduce((sum, e) => sum + parseFloat(e.impactedem33), 0);

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

    floodingData = d;
    geoData = f; 

    sortedCounties = floodingData.sort((a, b) => +b.impactedem33 - +a.impactedem33);
    longestCounty = +sortedCounties[0].impactedem33;
    nCounties = floodingData.length;
    //console.log((maxTotal / 1000) / BOX_ROWS);
    constructScene();
  })
}

function constructScene() {
  width = $wrap.getBoundingClientRect().width;
  height = $wrap.getBoundingClientRect().height;

  availableHeight = height - (padding.top + padding.bottom);
  barHeight = availableHeight / nCounties;
  barGap = 10;
  totalWidth = width - padding.left - padding.right;

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

  nPoints = sumArray(Object.values(floodedByYear));
  pointWidth = 2;

  projection = d3.geoAlbers()
    .fitSize([width, height - 200], geoData);

  points = createPoints(nPoints);

  poses = [
    mapLayout, 
    ktGridLayout, 
    emGridLayout18, 
    emGridLayout33,
    countyLayout
  ];
  
  currentPose = 0;

  poses[currentPose](points);

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
    point.colorStart = point.colorEnd;
  })

  poses[currentPose](points);

  points.forEach(point => {
    point.tx = point.x,
    point.ty = point.y,
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
      pointWidth,
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
  console.log(regl, regl.prop)

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

      // variables to send to the fragment shader
      varying vec3 fragColor;

      // values that are the same for all vertices
      uniform float pointWidth;
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
        // update the size of a point based on the prop pointWidth
        gl_PointSize = pointWidth;

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
      index: points.map(d => d.id),
    },

    uniforms: {
      // by using `regl.prop` to pass these in, we can specify
      // them as arguments to our drawPoints function
      pointWidth: regl.prop('pointWidth'),

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
    colorEnd: [0, 0, 0]
  }));
}

function mapLayout(points) {
  return points.map((point, i) => {
    // If this is a property that floods during king tides...
    if (i < floodedByYear.kt18) {
      let [x, y] = projection(geoData.features[i].geometry.coordinates);
      point.x = x;
      point.y = y + 100;
      point.color = colors.darkGray;
    } else {
      point.x = width + 5;
      point.y = height / 2;
      point.color = colors.red;
    }

    return point;
  });
}

function ktGridLayout(points) {
  return genericGridLayout(points, floodedByYear.kt18)
}

function emGridLayout18(points) {
  return genericGridLayout(points, floodedByYear.em18 + floodedByYear.kt18)
}

function emGridLayout33(points) {
  return genericGridLayout(points, points.length)
}

let previousMade = false;
let previousPoints = [];

function genericGridLayout(points, cutoff) {
  const BOX_ROWS = 9;
  const BOX_COLS = 12;
  const N_DOTS_PER_BOX = 1000;
  const BOX_SIDE = 50;
  const BOX_GAP = 5;
  const totalHeight = (BOX_ROWS * (BOX_SIDE + BOX_GAP)) - BOX_GAP;
  const totalWidth = (BOX_COLS * (BOX_SIDE + BOX_GAP)) - BOX_GAP;

  return points.map((point, i) => {
    let boxNum = Math.floor(i / N_DOTS_PER_BOX);
    let col = Math.floor(boxNum / BOX_ROWS);
    let row = boxNum - (col * BOX_ROWS);

    let minY = row * (BOX_SIDE + BOX_GAP);
    let maxY = minY + BOX_SIDE;

    let minX = col * (BOX_SIDE + BOX_GAP);
    let maxX = minX + BOX_SIDE;

    if (i < cutoff) {
      if (i < previousPoints.length) {
        point.x = previousPoints[i].x;
        point.y = previousPoints[i].y;
      } else {
        let x = ((Math.random() * (maxX - minX)) + minX) + (width / 2) - (totalWidth / 2);
        let y = ((Math.random() * (maxY - minY)) + minY) + (height / 2) - (totalHeight / 2);
        point.x = x;
        point.y = y;
        previousPoints.push({x, y});
      }
      
    } else {
      point.x = width + 5;
      point.y = height / 2;
    }

    if (i < floodedByYear.kt18 + floodedByYear .em18) {
      point.color = colors.darkGray;
    } else {
      point.color = colors.red;
    }

    return point;
  })  
}

function countyLayout(points) {
  let currentCounty = 0;
  let currentCountInCounty = 0;

  return points.map((point, i) => {
    let total = +sortedCounties[currentCounty].impactedem33;
    
    if (currentCountInCounty < total) {
      currentCountInCounty += 1;
    } else {
      currentCounty += 1;
      currentCountInCounty = 0;
    }

    let minX = padding.left;
    let maxX = minX + (total / longestCounty) * totalWidth;
    let minY = padding.top + barHeight * currentCounty;
    let maxY = minY + (barHeight - barGap);

    point.x = (Math.random() * (maxX - minX)) + minX;
    point.y = (Math.random() * (maxY - minY)) + minY;
    point.color = colors.darkGray;
    return point;
  }); 
} 

function resize() {

}

export default {
  init,
  resize
}
