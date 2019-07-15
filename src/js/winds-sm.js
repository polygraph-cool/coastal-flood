import loadData from './load-data';

let data;

// constants
const containerSelector = '#wind-sm';
const minChartWidth = 250;
const chartAspectRatio = 1.5;

// Scales and measures
let svgWidth,
    svgHeight,
    chartWidth,
    chartHeight,
    xScale,
    yScale,
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
    $charts;

function init() {
  loadData(['winds_county.json'])
    .then(([d]) => {
      data = d.map(entry => {
        return Object.keys(entry).reduce((obj, key) => {
          if (key === 'situs_county' || key === 'situs_state_code') {
            obj[key] = entry[key];
          } else {
            obj[key] = parseFloat(entry[key]);
          }
          return obj;
        }, {});
      }).sort((a, b) => a.year - b.year);

      console.log(data)

      constructChart();
    });
}

function constructChart() {
  $container = d3.select(containerSelector);

  $svg = $container.append('svg');

  $charts = $svg.selectAll('.chart')
    .data(data)
    .enter()
    .append('g')
    .classed('chart', true);

  resize();
}

function renderChart() {
  $svg.attr('width', svgWidth)
    .attr('height', svgHeight)
}

function resize() {
  svgWidth = $container.node().getBoundingClientRect().width - margins.left - margins.right;

  let numChartsInRow = Math.floor(svgWidth / minChartWidth);

  chartWidth = svgWidth / numChartsInRow
  chartHeight = chartWidth * chartAspectRatio;

  svgHeight = Math.ceil(data.length / numChartsInRow) * chartHeight;

  renderChart();
}

export default {
  init,
  resize
}

