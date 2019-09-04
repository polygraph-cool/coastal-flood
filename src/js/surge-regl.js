import loadData from './load-data';
import initREGL from 'regl'; 
import scrollama from 'scrollama';
import { sumArray } from './math-utils';

const scroller = scrollama();

let initialized = false;

let previousPoints = [];

// setup the instance, pass callback functions
scroller
  .setup({
    step: '.surge-step'
  })
  .onStepEnter(({ element, index, direction }) => {
    let poseNum = parseInt(element.dataset.pose);

    d3.selectAll('.surge-step')
      .style('opacity', function() {
        if (this === element) {
          return 1;
        } else {
          return 0.3;
        }
      })

    if (initialized && !isNaN(poseNum)) {
      animateToPose(poseNum);
      //showCountyLabels(poseNum === 4);
    }
  })
  .onStepExit(response => {
    // { element, index, direction }
  });


let data, tidal, floodedByYear;

const selector = '#surge-main__chart';
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
 
function init() {
  d3.selectAll('.surge-step')
      .style('opacity', 0.3)

  loadData(['surge.json', 'tidal.json']).then(([d, t]) => {
  console.log(d, t)
    //floodingData = d;
    data = d;
    tidal = t;

    let kt18 = sumArray(t, e => parseFloat(e.impacted_kt18));
    let em18 = sumArray(t, e => parseFloat(e.impacted_em18));
    let kt80 = sumArray(t, e => parseFloat(e.impacted_kt80));
    let em80 = sumArray(t, e => parseFloat(e.impacted_em80));


    floodedByYear = {
      kt18,
      em80,
      em18,
      kt80
    }

    console.log(floodedByYear)

    constructScene();
  })
}

function constructScene() {
  width = $wrap.getBoundingClientRect().width;
  height = $wrap.getBoundingClientRect().height;

  availableHeight = height //- (padding.top + padding.bottom);
  totalWidth = width //- padding.left - padding.right;

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

  nPoints = data[0].buildings_flooded_surge_rp30_2013;

  console.log(nPoints, floodedByYear)

  pointWidth = 2;

  points = createPoints(nPoints);

  poses = [
    emGridLayout18,
    surgeGridLayout
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

  console.log(points)

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
      color: [1, 0, 0, 0],
      depth: 1,
    });

    console.log(width, height)

    // draw the points using our created regl func
    // note that the arguments are available via `regl.prop`.
    drawPoints({
      pointWidth: 2,
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
      elapsed: ({ time }, { startTime = 0 }) => {
        return (time - startTime) * 1000
      },
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

function rgbStringToArr(str) {
  str = str.slice(4, str.length - 1);

  return str.split(',').map(e => parseInt(e) / 255)
}

function squareLayout2020(points) {
  let total2020 = Math.floor(data.reduce((sum, e) => {
    return sum + parseFloat(e.exposure_surge_2020)
  }, 0));

  let total2050 = Math.floor(data.reduce((sum, e) => {
    return sum + parseFloat(e.exposure_surge_2050)
  }, 0));

  let padding = 100;
  let constrainingDimension = Math.min(width, height);
  let squareSide = constrainingDimension - (padding * 2);
  let height2020 = squareSide * (total2020 / total2050);
  let height2050 = squareSide - height2020;

  let x1 = 0;
  let x2 = padding + squareSide;
  let y1 = padding + height2050;
  let y2 = y1 + height2020;

  return points.map((point, i) => {
    if (i < total2020) {
      point.x = point.sx || x1 + (Math.random() * (x2 - x1))
      point.y = point.sy || y1 + (Math.random() * (y2 - y1))
      point.color = colors.darkGray;
      point.width = 3;

    } else {
      point.x =  x1 + (Math.random() * (x2 - x1));
      point.y = 0 - 5 - (Math.random() * 100)
      point.color = colors.red;
      point.width = 3;
    }

    return point;
  });
}

function gray() {
  return colors.darkGray;
}

function emGridLayout18(points) {
  return genericGridLayout(points, floodedByYear.em18, gray);
}

function surgeGridLayout(points) {
  return genericGridLayout(points, points.length, gray);
}

function genericGridLayout(points, cutoff, colorFn) {
  const BOX_ROWS = 9;
  //const BOX_COLS = 12;
  const N_DOTS_PER_BOX = 1000;
  const BOX_SIDE = 50;
  const BOX_GAP = 5;

  const nBoxesKt18 = Math.ceil(floodedByYear.kt18 / N_DOTS_PER_BOX);
  const nBoxesEm18 = Math.ceil((floodedByYear.em18 - floodedByYear.kt18) / N_DOTS_PER_BOX);

  const BOX_COLS_KT = Math.ceil(nBoxesKt18 / BOX_ROWS);
  const BOX_COLS_EM = Math.ceil(nBoxesEm18 / BOX_ROWS);

  const totalHeight = (BOX_ROWS * (BOX_SIDE + BOX_GAP)) - BOX_GAP;
  const totalWidth = ((BOX_COLS_EM + BOX_COLS_KT + 1) * (BOX_SIDE + BOX_GAP)) - BOX_GAP;

  return points.map((point, i) => {
    let BOX_COLS = i < floodedByYear.kt18 ? BOX_COLS_KT : BOX_COLS_EM;
    let offset = i < floodedByYear.kt18 ? 0 : (BOX_COLS_KT + 1) * (BOX_SIDE + BOX_GAP);

    let trueI = i < floodedByYear.kt18 ? i : i - floodedByYear.kt18;

    let boxNum = Math.floor(trueI / N_DOTS_PER_BOX);
    let col = Math.floor(boxNum / BOX_ROWS);
    let row = boxNum - (col * BOX_ROWS);

    let minY = row * (BOX_SIDE + BOX_GAP);
    let maxY = minY + BOX_SIDE;

    let minX = (col * (BOX_SIDE + BOX_GAP)) + offset;
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
      print('out of cutoff')
      point.x = width + 5 + Math.random() * 500;
      point.y = Math.random() * height;
    }

    point.color = [1,1,1]//colorFn(i);

    return point;
  })  
}

function squareLayout2050(points) {
  let total2020 = Math.floor(data.reduce((sum, e) => {
    return sum + parseFloat(e.exposure_surge_2020)
  }, 0));

  let total2050 = Math.floor(data.reduce((sum, e) => {
    return sum + parseFloat(e.exposure_surge_2050)
  }, 0));

  let padding = 100;
  let constrainingDimension = Math.min(width, height);
  let squareSide = constrainingDimension - (padding * 2);
  let height2020 = squareSide * (total2020 / total2050);
  let height2050 = squareSide - height2020;

  let x1 = 0;
  let x2 = padding + squareSide;
  let y1 = padding + height2050;
  let y2 = y1 + height2020;

  let y1_2050 = padding;
  let y2_2050 = y1_2050 + height2050;

  return points.map((point, i) => {
    if (i < total2020) {
      point.x = point.sx;
      point.y = point.sy;
      point.color = colors.darkGray;
      point.width = 3;

    } else {
      point.x = point.sx || x1 + (Math.random() * (x2 - x1))
      point.y = y1_2050 + (Math.random() * (y2_2050 - y1_2050))
      point.color = colors.red;
      point.width = 3;
    }

    return point;
  });
}

function resize() {

}

export default {
  init,
  resize
}
