import loadData from './load-data';
import initREGL from 'regl'; 
import { sumArray } from './math-utils';

let floodingData, geoData, floodedByYear;

const selector = '#tidal-graphic';
const $wrap = document.querySelector(selector);

const regl = initREGL($wrap)

let width,
  height,
  projection;

let points,
  poses,
  currentPose;

let colors = {
  darkGray: [0.5, 0.5, 0.5],
  red: [1, 0, 0]
}

function init() {
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
    //console.log((maxTotal / 1000) / BOX_ROWS);
    constructScene();
  })
}

function constructScene() {
  width = $wrap.getBoundingClientRect().width;
  height = $wrap.getBoundingClientRect().width;

  const duration = 1000;

  const nPoints = sumArray(Object.values(floodedByYear));
  const pointWidth = 2;

  projection = d3.geoAlbers()
    .translate([-2600, 500]) 
    .scale([12500])
    .rotate([90, 0])
    .parallels([29.5, 45.5]);

  points = createPoints(nPoints);

  poses = [mapLayout, ktGridLayout, emGridLayout18, emGridLayout33];
  currentPose = 0;

  poses[currentPose](points);

  const delayByIndex = 500 / points.length;

  let startTime = null;

  function animateToPose(poseNum) {
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
        color: [0, 0, 0, 1],
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

      if (time - startTime > ((duration + 500) / 1000)) {
        frameLoop.cancel();
        startTime = null;
      }
    });

  }

  //const drawPoints = getDrawPoints(points);

  animateToPose(0);
  
  document.body.addEventListener('click', () => {
    console.log('click')
    animateToPose(currentPose + 1);
  })
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
      point.y = y;
      point.color = colors.darkGray;
    } else {
      point.x = 0;
      point.y = 0;
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
      let [x, y] = projection(geoData.features[i].geometry.coordinates);
      point.x = (Math.random() * (maxX - minX)) + minX;
      point.y = (Math.random() * (maxY - minY)) + minY;
    } else {
      point.x = 0;
      point.y = 0;
    }

    if (i < floodedByYear.kt18 + floodedByYear .em18) {
      point.color = colors.darkGray;
    } else {
      point.color = colors.red;
    }

    return point;
  })  
} 

function resize() {

}

export default {
  init,
  resize
}
