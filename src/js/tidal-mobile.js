import loadData from './load-data';
import initREGL from 'regl'; 
import scrollama from 'scrollama';
import 'd3-textwrap'
import { sumArray } from './math-utils';

const scroller = scrollama();



const BOX_ROWS =  15;
//const BOX_COLS = 12;
const N_DOTS_PER_BOX = 1000;
const BOX_GAP = 5;

let barChartView;

let floodingData, geoData, floodedByYear;

const selector = '#tidal-graphic';
const $wrap = document.querySelector(selector);

const regl = initREGL($wrap);

let imageWidth = 5314;
let imageHeight = 2480;

let toggle = d3.select('#tidal-toggle');

barChartView = toggle.property('value');

toggle.on('change', function(e) {
  barChartView = d3.select(this).property('value');
  animateToPose(4);
});

let width,
  height,
  projection,
  path,
  xScale,
  xAxis;

let $svg,
  $labels,
  $boxesKt,
  $boxesEm,
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
  $xAxis,
  $countyHeader = d3.select('#county-header'),
  $basemap = d3.select('#tidal-graphic img');

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

const padding = {top: 200, bottom: 100, left: 130, right: 40}

let sortedCounties,
  nCounties,
  availableHeight,
  barHeight,
  barGap,
  totalWidth,
  longestCounty;



let fns = {
  in_0: () => {
  },
  in_1: () => {
  },
  in_2: () => {
  },
  in_3: () => {
  },
  in_4: () => {
  }
}

/*
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
*/

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
  let totalHeight = height - padding.bottom - padding.top;

  xScale = d3.scaleLinear()
    .domain([0, floodedByYear.em18])
    .range([0, totalWidth])

  xAxis = d3.axisBottom()
    .scale(xScale)
    .tickSize(-(totalHeight + 5))
    .tickFormat(d3.format('.1s'))
    .tickPadding(15);

  $svg = d3.select(selector).append('svg')
    .attr('width', width)
    .attr('height', height);


  const nBoxesKt18 = Math.ceil(floodedByYear.kt18 / N_DOTS_PER_BOX);
  const nBoxesEm18 = Math.ceil((floodedByYear.em18) / N_DOTS_PER_BOX);

  const BOX_COLS_KT = Math.ceil(nBoxesKt18 / BOX_ROWS);
  const BOX_COLS_EM = Math.ceil(nBoxesEm18 / BOX_ROWS);

  const TOTAL_BOX_COLS = BOX_COLS_KT + BOX_COLS_EM + 1;
  let BOX_SIDE = (width - 100 * 2) / TOTAL_BOX_COLS;

  if (BOX_SIDE * BOX_ROWS > height  - 400) {
    BOX_SIDE = (height - 400) / BOX_ROWS;
  } 

  const totalChartHeight = (BOX_ROWS * (BOX_SIDE + BOX_GAP)) - BOX_GAP;
  const totalChartWidth = ((BOX_COLS_EM + BOX_COLS_KT + 1) * (BOX_SIDE + BOX_GAP)) - BOX_GAP;

  $boxesKt = $svg.selectAll('.box.king')
    .data(d3.extent(nBoxesKt18))
    .enter()
    .append('rect')
    .attr('width', BOX_SIDE - BOX_GAP)
    .attr('height', BOX_SIDE - BOX_GAP)
    .attr('x', (d, i) => Math.floor(i / BOX_ROWS) * BOX_SIDE)
    .attr('y', (d, i) => (i % BOX_ROWS) * BOX_SIDE)


  $xAxis = $svg.append('g')
    .classed('x axis', true)
    .style('opacity', 0)
    .attr('transform', `translate(${padding.left}, ${totalHeight + padding.top})`)
    .call(xAxis);

  $xAxis.select('.tick:last-child text')
    .text(function() {
      return d3.select(this).text() + ' properties'
    })


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

  $emHeader.append('tspan').text('Properties at risk')
  $emHeader.append('tspan').text('of annual flooding')
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

  let nBoxesLeft =  1;
  $orangeLabel = $svg.append('g')
    .classed('orange-label', true)
    .style('opacity', 0)
    .attr('transform', `translate(${
      (width / 2) - (totalChartWidth / 2) + ((BOX_SIDE + BOX_GAP) * nBoxesLeft)
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
}




function resize() {
  
}

export default {
  init,
  resize
}
