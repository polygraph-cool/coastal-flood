import loadData from './load-data';
import initREGL from 'regl'; 
import scrollama from 'scrollama';
import { sumArray } from './math-utils';

const scroller = scrollama();

let initialized = false;
let previousPose = 0;

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


    let delayTime = poseNum === 1 ? 2500 : 600;

    if (initialized && !isNaN(poseNum)) {
      animateToPose(poseNum, 1000, delayTime);
      //showCountyLabels(poseNum === 4);
    }

    stepFns[poseNum]();
  })
  .onStepExit(response => {
    // { element, index, direction }
  });


let data, tidal, floodedByYear;

const selector = '#surge-main__chart';
const $wrap = document.querySelector(selector);
const $canvas = d3.select($wrap).select('canvas');
const regl = initREGL($wrap)

let width,
  height,
  projection;

let $svg,
  $labels,
  $count1980,
  $count2020,
  $label1980,
  $label2020,
  $dollarCount,
  $title;

let points,
  poses,
  currentPose,
  nPoints,
  pointWidth;

let colors = {
  darkGray: [0.5, 0.5, 0.5, 0.7],
  blue: '#8080F7',
  orange: '#e36f22',  
  red: [227 / 255, 111 / 255, 34 / 255, 0.7]
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

let stepFns = {
  0: () => {
    $count2020
      .transition()
      .duration(300)
      .style('opacity', 0);

    $label2020
      .transition()
      .duration(300)
      .style('opacity', 0);

  },
  1: () => {
    console.log('1')
     $count2020
      .transition()
      .duration(300)
      .style('opacity', 1)
      .on('end', () => {
        $count2020
          .transition()
          .duration(2000)
          .tween("text", function(d) {
            var i = d3.interpolate(0, +data.buildings_flooded_surge_rp30_2013);
            return function(t) {
              d3.select(this).text(d3.format(".3s")(i(t)));
            };
          })
      });


    $label2020
      .transition()
      .duration(300)
      .style('opacity', 1);

    $dollarCount
      .transition()
      .duration(300)
      .style('opacity', 0)

     $title
      .transition()
      .duration(600)
      .style('opacity', 1)
  },
  2: () => {
    $title
      .transition()
      .duration(600)
      .style('opacity', 0)

    $count2020
      .transition()
      .duration(600)
      .style('opacity', 0);

    $label2020
      .transition()
      .duration(600)
      .style('opacity', 0);

    $dollarCount
      .transition()
      .duration(600)
      .style('opacity', 1)
      .on('end', () => {
        $dollarCount
          .transition()
          .duration(2000)
          .tween("text", function(d) {
            var i = d3.interpolate(0, 60000000000);
            return function(t) {
              d3.select(this).text(d3.format('$,.0f')(i(t)));
            };
          })
      });
  }
}
 
function init() {
  d3.selectAll('.surge-step')
      .style('opacity', 0.3)

  loadData(['surge.json', 'tidal.json']).then(([d, t]) => {
    //floodingData = d;
    data = d[0];
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

    constructScene();
  })
}

function constructScene() {
  width = $wrap.getBoundingClientRect().width;
  height = $wrap.getBoundingClientRect().height;

  availableHeight = height //- (padding.top + padding.bottom);
  totalWidth = width //- padding.left - padding.right;

  $svg = d3.select(selector)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('top', 0)
    .style('left', 0)
    .style('position', 'absolute');

  $title = $svg.append('text')
    .text('Properties Newly Threatened by Hurricane Flooding')
    .attr('x', width / 2)
    .attr('y', 100)
    .attr('text-anchor', 'middle')
    .attr('alignment-baseline', 'center')
    .classed('surge-title', true)

  $dollarCount = $svg.append('text')
    .text('0')
    .attr('y', height / 2)
    .attr('x', width / 2)
    .style('fill', 'white')
    .style('opacity', 0)
    .attr('text-anchor', 'middle')
    .attr('alignment-baseline', 'middle')
    .classed('dollar-count', true);

  $count2020 = $svg.append('text')
    .text('0')
    .attr('y', height - 150)
    .style('fill', 'white')
    .attr('x', (width / 2))
    .attr('text-anchor', 'middle')
    .style('opacity', 0)
    .classed('count-label', true);

  $label2020 = $svg.append('text')
    .attr('y', height - 120)
    .style('fill', 'white')
    .attr('x', (width / 2))
    .attr('text-anchor', 'middle')
    .style('opacity', 0)
    .classed('count-label-text', true);

  $label2020.append('tspan')
    .attr('x', (width / 2))
    .text('additional properties')

  $label2020.append('tspan')
    .attr('x', (width / 2))
    .text('at risk in 2013')
    .attr('dy', 26)

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

  nPoints = data.buildings_flooded_surge_rp30_2013;

  pointWidth = 2;

  points = createPoints(nPoints);

  poses = [
    surgeLayout1980,
    surgeLayout2020,
    circleLayout,
    coloredCircleLayout,
  ];
  
  currentPose = 0;

  poses[currentPose](points);

  //const drawPoints = getDrawPoints(points);

  animateToPose(0, 0);

  initialized = true;
}




function animateToPose(poseNum, duration=1000, delayTime=600) {

  previousPose = currentPose;
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
      pointWidth: 2,
      stageWidth: width,
      stageHeight: height,
      duration,
      startTime,
    });

    if (time - startTime > ((duration + delayTime) / 1000)) {
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
      varying vec4 fragColor;

      void main() {
        // gl_FragColor is a special variable that holds the color
        // of a pixel
        gl_FragColor = fragColor;
      }
    `,
    vert: `
      // per vertex attributes
      attribute vec2 positionStart;
      attribute vec2 positionEnd;
      attribute vec4 colorStart;
      attribute vec4 colorEnd;
      attribute float index;
      attribute float delay;

      // variables to send to the fragment shader
      varying vec4 fragColor;

      // values that are the same for all vertices
      uniform float pointWidth;
      uniform float stageWidth;
      uniform float stageHeight;
      uniform float elapsed;
      uniform float duration;

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
      delay: points.map(d => d.delay),
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
      duration: regl.prop('duration'),
      // time in ms since the prop startTime (i.e. time elapsed)
      // note that `time` is passed by regl whereas `startTime`
      // is a prop passed to the drawPoints function.
      elapsed: ({ time }, { startTime = 0 }) => {
        return (time - startTime) * 1000
      },
    },
     blend: {
      enable: true,
      func: {
        srcRGB: 'src alpha',
        srcAlpha: 'src alpha',
        dstRGB: 'one minus src alpha',
        dstAlpha: 'one minus src alpha',
      },
    },
    depth: { enable: false },

    // specify the number of points to draw
    count: points.length,

    // specify that each vertex is a point (not part of a mesh)
    primitive: 'points',
  });
}

function createPoints(nPoints) {
  let delayByIndex = 600 / nPoints;

  return d3.range(nPoints).map((d, i) => ({
    id: i,
    tx: 0,
    ty: 0,
    colorEnd: [0, 0, 0, 0],
    delay: i * delayByIndex
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

function circleLayout(points) {
  let radius = width / 2;

  return points.map((point, i) => {
    let theta = Math.random() * (Math.PI * 2);
    let r = radius * Math.sqrt(Math.random());

    let x = r * Math.cos(theta) + (width / 2);
    let y = r * Math.sin(theta) + (height / 2);

    point.x = x;
    point.y = y;
    point.delay = (600 / points.length) * i;
    point.color = colors.darkGray;

    return point;
  });
}

function coloredCircleLayout(points) {
  let radius = width / 2;

  return points.map((point, i) => {
    let theta = Math.random() * (Math.PI * 2);
    let r = radius * Math.sqrt(Math.random());

    let x = previousPose === 2 ? point.x : r * Math.cos(theta) + (width / 2);
    let y = previousPose === 2 ? point.y : r * Math.sin(theta) + (height / 2);

    theta = Math.atan2(y - (height / 2), x - (width / 2));

    if (theta < 0) {
      theta += (Math.PI * 2);
    }

    point.x = x;
    point.y = y;
    point.delay = (600 / points.length) * i;
    point.color = theta < (Math.PI * 2 * .66) ? colors.red : colors.darkGray;

    return point;
  });
} 


function genericGridLayout(points, cutoff, colorFn) {
  const BOX_ROWS = 9;
  //const BOX_COLS = 12;
  const N_DOTS_PER_BOX = 1000;
  const BOX_SIDE = 50;
  const BOX_GAP = 5;

  const nBoxes = Math.ceil(cutoff / N_DOTS_PER_BOX);

  const BOX_COLS = Math.ceil(nBoxes / BOX_ROWS);

  const totalHeight = (BOX_ROWS * (BOX_SIDE + BOX_GAP)) - BOX_GAP;
  const totalWidth = ((BOX_COLS) * (BOX_SIDE + BOX_GAP)) - BOX_GAP;

  return points.map((point, i) => {

    let trueI = i;

    let boxNum = Math.floor(trueI / N_DOTS_PER_BOX);
    let col = Math.floor(boxNum / BOX_ROWS);
    let row = boxNum - (col * BOX_ROWS);

    let minY = row * (BOX_SIDE + BOX_GAP);
    let maxY = minY + BOX_SIDE;

    let minX = (col * (BOX_SIDE + BOX_GAP));
    let maxX = minX + BOX_SIDE;

    let x = ((Math.random() * (maxX - minX)) + minX) + (width / 2) - (totalWidth / 2);
    let y = ((Math.random() * (maxY - minY)) + minY) + (height / 2) - (totalHeight / 2);
    point.x = x;
    point.y = y;

    point.color = colorFn(i);

    return point;
  })  
}


function surgeLayout1980(points) {
  const BOX_ROWS = 9;
  //const BOX_COLS = 12;
  const N_DOTS_PER_BOX = 1000;
  const BOX_SIDE = 50;
  const BOX_GAP = 5;

  const nBoxes = Math.ceil(points.length / N_DOTS_PER_BOX);

  const BOX_COLS = Math.ceil(nBoxes / BOX_ROWS);

  const totalHeight = (BOX_ROWS * (BOX_SIDE + BOX_GAP)) - BOX_GAP;
  const totalWidth = ((BOX_COLS) * (BOX_SIDE + BOX_GAP)) - BOX_GAP;

  let minX = (width / 2) - (totalWidth / 2);
  let maxX = minX + totalWidth;
  
  return points.map((point, i) => {
    let x = ((Math.random() * (maxX - minX)) + minX);
    let y = -10;
    point.x = x;
    point.y = y;
    point.color = colors.darkGray;
    point.width = 3;
  })
}

function surgeLayout2020(points) {
  return genericGridLayout(points, points.length, () => colors.darkGray)
  let n1980 = +data.buildings_flooded_surge_rp30_1980;
  let n2020 = +data.buildings_flooded_surge_rp30_2013;
  
  let paddingTop = 250;
  let paddingBottom = 200;

  let height2020 = height - (paddingTop + paddingBottom);
  let height1980 = height2020 * (n1980 / n2020);

  let barWidth = width / 5;

  let maxY = paddingTop + height2020;
  let minY1980 = maxY - height1980;
  let minY2020 = maxY - height2020;

  let minX1980 = barWidth;
  let maxX1980 = 2 * barWidth;
  let minX2020 = 3 * barWidth;
  let maxX2020 = 4 * barWidth;
  
  return points.map((point, i) => {
    if (i < n1980) {
      point.x = previousPose === 0 ? point.x : between(minX1980, maxX1980);
      point.y = previousPose === 0 ? point.y : between(minY1980, maxY);
      point.color = colors.darkGray;
      point.width = 3;
    } else {
      let y = between(minY2020, maxY);
      point.x = previousPose === 0 ? point.x : between(minX2020, maxX2020);
      point.y = y;
      point.color = colors.darkGray;
      point.width = 3;
      point.delay = 2000 - (2000 * ((y - minY2020) / (maxY - minY2020))) + (Math.random() * 100)
    }
  })
}

function between(a, b) {
  return (Math.random() * (b - a)) + a;
}

function resize() {

}

export default {
  init,
  resize
}
