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
    line,
    numChartsInRow,
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
    $charts,
    $paths;

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

      data.forEach(county => {
        county.lineValues = [
          {
            'year': 1985,
            'value': county['expected_rcp85_hurricane_wind_exposure_1979_1989_q0.50']
          },
          {
            'year': 2018,
            'value': county['expected_rcp85_hurricane_wind_exposure_2008_2018_q0.50']
          },
          {
            'year': 2050,
            'value': county['expected_rcp85_hurricane_wind_exposure_2045_2055_q0.50']
          }
        ]
      })

      constructChart();
    });
}

function constructChart() {
  xScale = d3.scaleBand()
    .domain(data[0].lineValues.map(e => e.year).sort());

  yScale = d3.scaleLinear()
    .domain([0, d3.max(data.map(e => e['expected_rcp85_hurricane_wind_exposure_2045_2055_q0.95']))]);

  line = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.value));

  $container = d3.select(containerSelector);

  $svg = $container.append('svg');

  $charts = $svg.selectAll('.chart')
    .data(data)
    .enter()
    .append('g')
    .classed('chart', true);

  $paths = $charts.selectAll('path')
    .data(d => [d.lineValues])
    .enter()
    .append('path')
    .style('fill', 'none')
    .style('stroke', 'white');

  resize();
}

function renderChart() {
  $svg.attr('width', svgWidth)
    .attr('height', svgHeight);

  $charts.attr('transform', (d, i) => {
    let rowIndex = Math.floor(i / numChartsInRow);
    let colIndex = i - (rowIndex * numChartsInRow);

    return `translate(${colIndex * chartWidth},${rowIndex * chartHeight})`
  });

  $paths.attr('d', d => line(d));
}

function resize() {
  svgWidth = $container.node().getBoundingClientRect().width;

  numChartsInRow = Math.floor(svgWidth / minChartWidth);

  chartWidth = svgWidth / numChartsInRow
  chartHeight = chartWidth * chartAspectRatio;

  svgHeight = Math.ceil(data.length / numChartsInRow) * chartHeight;

  xScale.range([0, chartWidth]);
  yScale.range([chartHeight, 0]);

  renderChart();
}

export default {
  init,
  resize
}

