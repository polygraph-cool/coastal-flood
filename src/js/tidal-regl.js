import loadData from './load-data';
import initREGL from 'regl'; 
import scrollama from 'scrollama';
import 'd3-textwrap'
import { sumArray } from './math-utils';

const scroller = scrollama();

let initialized = false;

let barChartView;

let floodingData, geoData, floodedByYear;

const selector = '#tidal-graphic';
const $wrap = document.querySelector(selector);

const regl = initREGL($wrap);

let imageWidth = 5314;
let imageHeight = 2480;

let corners = {
  tl: [-78.26638889, 42.21583333],
  tr: [-70.00388889, 40.78222222],
  bl: [-78.97888889, 39.33555556],
  br: [-71.02222222, 37.95972222]
}

let toggle = d3.select('#tidal-toggle');

barChartView = toggle.property('value');

toggle.on('change', function(e) {
    barChartView = d3.select(this).property('value');
    animateToPose(4);
  });

console.log(toggle)

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

let width,
  height,
  projection,
  path;

let $svg,
  $labels,
  $boxLabel,
  $boxLabelSquare,
  $boxLabelLine,
  $boxLabelText,
  $orangeLabel,
  $orangeLabelSquare,
  $orangeLabelLine,
  $orangeLabelText,
  $ktHeader,
  $emHeader,
  $countyHeader = d3.select('#county-header'),
  $basemap = d3.select('#tidal-graphic img').style('opacity', 0.8);

let points,
  poses,
  currentPose,
  nPoints,
  pointWidth;

let colors = {
  darkGray: [0.5, 0.5, 0.5, 0.7],
  red: [227 / 255, 111 / 255, 34 / 255, 0.7],
  orange: [227 / 255, 111 / 255, 34 / 255, 0.7]
}

let startTime = null;

const padding = {top: 200, bottom: 100, left: 300, right: 100}

let sortedCounties,
  nCounties,
  availableHeight,
  barHeight,
  barGap,
  totalWidth,
  longestCounty;



let fns = {
  in_0: () => {
    $orangeLabel
      .transition()
      .duration(400)
      .style('opacity', 0)

    $emHeader.transition()
      .duration(400)
      .style('opacity', 0)

    $ktHeader.transition()
      .duration(400)
      .style('opacity', 0)

    $boxLabel
        .transition()
        .duration(400)
        .style('opacity', 0)  

    $basemap
      .transition()
      .duration(600)
      .style('opacity', 0.7)

    $countyHeader
      .transition()
      .duration(600)
      .style('opacity', 0)
  },
  in_1: () => {
    $orangeLabel
      .transition()
      .duration(400)
      .style('opacity', 0)

    $emHeader.transition()
      .duration(400)
      .style('opacity', 0)

    $ktHeader.transition()
      .duration(400)
      .delay(700)
      .style('opacity', 1)

    $boxLabel
      .transition()
      .duration(400)
      .delay(700)
      .style('opacity', 1) 

    $basemap
      .transition()
      .duration(600)
      .style('opacity', 0.2) 

    $countyHeader
      .transition()
      .duration(600)
      .style('opacity', 0)  
  },
  in_2: () => {
    $orangeLabel
      .transition()
      .duration(400)
      .style('opacity', 0)

    $emHeader.transition()
      .duration(400)
      .delay(700)
      .style('opacity', 1)

    $ktHeader.transition()
      .duration(400)
      .delay(700)
      .style('opacity', 1)

    $boxLabel
        .transition()
        .duration(400)
        .delay(700)
        .style('opacity', 1)

    $basemap
      .transition()
      .duration(600)
      .style('opacity', 0.2) 

    $countyHeader
      .transition()
      .duration(600)
      .style('opacity', 0)
  },
  in_3: () => {
    $orangeLabel
      .transition()
      .duration(400)
      .delay(700)
      .style('opacity', 1)

    $emHeader.transition()
      .duration(400)
      .delay(700)
      .style('opacity', 1)

    $ktHeader.transition()
      .duration(400)
      .delay(700)
      .style('opacity', 1)

    $boxLabel
      .transition()
      .duration(400)
      .delay(700)
      .style('opacity', 1)

    $basemap
      .transition()
      .duration(600)
      .style('opacity', 0.2) 

    $countyHeader
      .transition()
      .duration(600)
      .style('opacity', 0)
  },
  in_4: () => {
    $orangeLabel
      .transition()
      .duration(400)
      .style('opacity', 0)

    $boxLabel
      .transition()
      .duration(400)
      .style('opacity', 0)

    $emHeader.transition()
      .duration(400)
      .style('opacity', 0)

    $ktHeader.transition()
      .duration(400)
      .style('opacity', 0)

    $basemap
      .transition()
      .duration(600)
      .style('opacity', 0.2) 

    $countyHeader
      .transition()
      .duration(600)
      .delay(700)
      .style('opacity', 1)
  }
}


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

      let key = `in_${poseNum}`;

      console.log(key)

      fns[key](direction);
    }
  })
  .onStepExit(({ element, index, direction }) => {
     let poseNum = parseInt(element.dataset.pose);

    if (initialized && !isNaN(poseNum)) {


      let key = `out_${poseNum}`;

      fns[key](direction);
    }
  });

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
    let maxTotal = d.reduce((sum, e) => sum + parseFloat(e.impacted_em18), 0);

    let kt18 = sumArray(d, e => parseFloat(e.impacted_kt18));
    let em18 = sumArray(d, e => parseFloat(e.impacted_em18));
    let kt80 = sumArray(d, e => parseFloat(e.impacted_kt80));
    let em80 = sumArray(d, e => parseFloat(e.impacted_em80));


    floodedByYear = {
      kt18,
      em80,
      em18,
      kt80
    }

    console.log(floodedByYear)

    floodingData = d;
    geoData = f; 

    sortedCounties = floodingData.filter(e => parseInt(e.impacted_em18) > 5).sort((a, b) => +b.impacted_em18 - +a.impacted_em18);
    longestCounty = +sortedCounties[0].impacted_em18;
    nCounties = sortedCounties.length;
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

  const BOX_ROWS = 9;
  //const BOX_COLS = 12;
  const N_DOTS_PER_BOX = 1000;
  const BOX_SIDE = 50;
  const BOX_GAP = 5;

  const nBoxesKt18 = Math.ceil(floodedByYear.kt18 / N_DOTS_PER_BOX);
  const nBoxesEm18 = Math.ceil((floodedByYear.em18 - floodedByYear.kt18) / N_DOTS_PER_BOX);

  const BOX_COLS_KT = Math.ceil(nBoxesKt18 / BOX_ROWS);
  const BOX_COLS_EM = Math.ceil(nBoxesEm18 / BOX_ROWS);

  const totalChartHeight = (BOX_ROWS * (BOX_SIDE + BOX_GAP)) - BOX_GAP;
  const totalChartWidth = ((BOX_COLS_EM + BOX_COLS_KT + 1) * (BOX_SIDE + BOX_GAP)) - BOX_GAP;

  $ktHeader = $svg.append('text')
    .style('opacity', 0)
    .classed('tidal-main-header', true)
    .attr('y', () => {
      return (height / 2) - (totalChartHeight / 2) - 100
    })
    .attr('x', () => {
      return ((width / 2) - (totalChartWidth / 2)) + ((BOX_COLS_KT * (BOX_SIDE + BOX_GAP)) / 2)
    })
    .style('transform', 'translate(0, 0)');

  $ktHeader.append('tspan').text('Properties at risk of')
  $ktHeader.append('tspan').text('frequent flooding')
    .attr('x', () => {
      return ((width / 2) - (totalChartWidth / 2)) + ((BOX_COLS_KT * (BOX_SIDE + BOX_GAP)) / 2)
    })
    .attr('dy', 30)

  $emHeader = $svg.append('text')
    .style('opacity', 0)
    .classed('tidal-main-header', true)
    .attr('y', () => {
      return (height / 2) - (totalChartHeight / 2) - 100
    })
    .attr('x', () => {
      return ((width / 2) - (totalChartWidth / 2)) + ((BOX_COLS_KT + 1) * (BOX_SIDE + BOX_GAP)) + ((BOX_COLS_EM * (BOX_SIDE + BOX_GAP)) / 2)
    });

  $emHeader.append('tspan').text('Additional properties at')
  $emHeader.append('tspan').text('risk of annual flooding')
    .attr('x', () => {
      return ((width / 2) - (totalChartWidth / 2)) + ((BOX_COLS_KT + 1) * (BOX_SIDE + BOX_GAP)) + ((BOX_COLS_EM * (BOX_SIDE + BOX_GAP)) / 2)
    })
    .attr('dy', 30)

  $boxLabel = $svg.append('g')
    .style('opacity', 0)
    .attr('transform', `translate(${(width / 2) - (totalChartWidth / 2)}, ${(height / 2) - (totalChartHeight / 2)})`)

  $boxLabelSquare = $boxLabel.append('rect')
    .attr('width', BOX_SIDE)
    .attr('height', BOX_SIDE)
    .attr('x', 0)
    .attr('y', 0)
    .style('fill', 'transparent')
    .style('stroke', 'white');

  $boxLabelLine = $boxLabel.append('path')
    .attr('d', () => {
      return `M ${BOX_SIDE / 2} 0 l 0 -20 l 50 0`;
    })
    .style('fill', 'transparent')
    .attr('stroke', 'white');

  $boxLabelText = $boxLabel.append('text')
    .text('1,000 properties')
    .attr('x', (BOX_SIDE / 2) + 60)
    .attr('y', -20)
    .attr('text-anchor', 'start')
    .attr('alignment-baseline', 'middle')
    .classed('box-label-text', true);

  $orangeLabel = $svg.append('g')
    .classed('orange-label', true)
    .style('opacity', 0)
    .attr('transform', `translate(${
      (width / 2) - (totalChartWidth / 2) + ((BOX_SIDE + BOX_GAP) * 3)
    }, ${
      (height / 2) - (totalChartHeight / 2) + ((BOX_ROWS - 1) * (BOX_SIDE + BOX_GAP))
    })`)


  $orangeLabelSquare = $orangeLabel.append('rect')
    .attr('width', BOX_SIDE + 2)
    .attr('height', BOX_SIDE + 2)
    .attr('x', 0)
    .attr('y', 0)
    .style('fill', 'transparent');

  $orangeLabelLine = $orangeLabel.append('path')
    .attr('d', () => {
      return `M ${BOX_SIDE / 2} ${BOX_SIDE + 2} l 0 20 l 50 0`;
    })
    .style('fill', 'transparent');

  $orangeLabelLine = $orangeLabel.append('text')
    .attr('x', (BOX_SIDE / 2) + 60)
    .attr('y', BOX_SIDE + 28)
    .attr('text-anchor', 'start')
    .attr('alignment-baseline', 'middle')
    .classed('box-label-text', true);

  $orangeLabelLine.append('tspan')
    .text('Properties newly exposed')

   $orangeLabelLine.append('tspan')
    .text('to flooding since 1985')
    .attr('x', (BOX_SIDE / 2) + 60)
    .attr('dy', 26)

  nPoints = floodedByYear.em18;

  pointWidth = 2;

  projection = d3.geoAlbers()
    .fitSize([width, height - 200], geoData);

  path = d3.geoPath()
    .projection(projection); 

  updateProjection();

  points = createPoints(nPoints);

  poses = [
    mapLayout, 
    ktGridLayout18, 
    emGridLayout18, 
    emGridLayoutYearDiff,
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

      // variables to send to the fragment shader
      varying vec4 fragColor;

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
  return d3.range(nPoints).map(i => ({
    id: i,
    tx: 0,
    ty: 0,
    colorEnd: [0, 0, 0, 0]
  }));
}

function mapLayout(points) {
  return points.map((point, i) => {
    // If this is a property that floods during king tides...
    if (i < floodedByYear.kt80) {
      let [x, y] = projection(geoData.features[i].geometry.coordinates);
      point.x = x;
      point.y = y;
      point.color = [1, 1, 1, 0.78];
    } else {
      point.x = width + 5;
      point.y = height / 2;
      point.color = colors.red;
    }

    return point;
  });
}

function gray() {
  return colors.darkGray;
}

function newFlooding(i) {
  if (i > floodedByYear.kt18) {
    i -= floodedByYear.kt18;
    return i > (floodedByYear.em80 - floodedByYear.kt80) ? colors.orange : colors.darkGray;
  } else {
    return i > floodedByYear.kt80 ? colors.orange : colors.darkGray;
  }
}

function ktGridLayout18(points) {
  return genericGridLayout(points, floodedByYear.kt18, gray)
}

function emGridLayout18(points) {
  return genericGridLayout(points, floodedByYear.em18, gray)
}

function emGridLayoutYearDiff(points) {
  return genericGridLayout(points, floodedByYear.em18 + floodedByYear.kt18, newFlooding)
}

let previousMade = false;
let previousPoints = [];

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
      point.x = width + 5 + Math.random() * 500;
      point.y = Math.random() * height;
    }

    point.color = colorFn(i);

    return point;
  })  
}

function countyLayout(points) {
  console.log(barChartView)
  if (barChartView === 'annual flooding') {
    return annualCountyLayout(points);
  } else if (barChartView === 'frequent flooding') {
    return frequentCountyLayout(points);
  }
} 

function annualCountyLayout(points) {
  let currentCounty = 0;
  let currentCountInCounty = 0;

  return points.map((point, i) => {
    let total = +sortedCounties[currentCounty].impacted_em18;
    
    if (currentCountInCounty < total) {
      currentCountInCounty += 1;
    } else {
      currentCounty += 1;
      currentCountInCounty = 0;
    }

    let pctIn1980s = +sortedCounties[currentCounty].impacted_em80 / +sortedCounties[currentCounty].impacted_em18;

    let barMinX = padding.left;
    let barMaxX = barMinX + (total / longestCounty) * totalWidth;
    let barWidth = barMaxX - barMinX;
  
    let maxX, minX;
  
    if (currentCountInCounty < +sortedCounties[currentCounty].impacted_em80) {
      minX = barMinX;
      maxX = minX + (barWidth * pctIn1980s);

    } else {
      minX = barMinX + (barWidth * pctIn1980s);
      maxX = minX + (barWidth * (1 - pctIn1980s))
    }
 
    let minY = padding.top + barHeight * currentCounty;
    let maxY = minY + (barHeight - barGap);

    point.x = (Math.random() * (maxX - minX)) + minX;
    point.y = (Math.random() * (maxY - minY)) + minY;

    point.color = currentCountInCounty < +sortedCounties[currentCounty].impacted_em80 ? colors.darkGray : colors.orange;
    return point;
  }); 
}

function frequentCountyLayout(points) {
  let currentCounty = 0;
  let currentCountInCounty = 0;

  console.log(sortedCounties)

  return points.map((point, i) => {
    let total = +sortedCounties[currentCounty].impacted_em18;
    
    let {
      impacted_kt18,
      impacted_kt80,
      impacted_em80,
      impacted_em18
    } = sortedCounties[currentCounty];

    if (currentCountInCounty < total) {
      currentCountInCounty += 1;
    } else {
      currentCounty += 1;
      currentCountInCounty = 0;
    }

    let pctIn1980s = +impacted_kt80 / +impacted_kt18;

    let barMinX = padding.left;
    let barMaxX = barMinX + (total / longestCounty) * totalWidth;
    let barWidth = (barMaxX - barMinX) * (+impacted_kt18 / +impacted_em18);
  
    let maxX, minX, color;
  
    if (currentCountInCounty < +impacted_kt80) {
      minX = barMinX;
      maxX = minX + (barWidth * pctIn1980s);
      color = colors.darkGray;
    } else if (currentCountInCounty < +impacted_em80) {
      minX = point.x;
      maxX = point.x;
      color = [0, 0, 0, 0]
    } else if (
      currentCountInCounty - (+impacted_em80) + (+impacted_kt80) < +impacted_kt18
    ) {
      minX = barMinX + (barWidth * pctIn1980s);
      maxX = minX + (barWidth * (1 - pctIn1980s));
      color = colors.orange;
    } else {
      minX = point.x;
      maxX = point.x;
      color = [0, 0, 0, 0]
    }
 
    let minY = padding.top + barHeight * currentCounty;
    let maxY = minY + (barHeight - barGap);

    point.x = (Math.random() * (maxX - minX)) + minX;
    point.y = (Math.random() * (maxY - minY)) + minY;

    point.color = color;
    return point;
  }); 
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
