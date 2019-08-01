import loadData from './load-data';

let data;


// constants
const containerSelector = '#tidal-values';
const minChartWidth = 400;
const chartAspectRatio = 0.8;

// Scales and measures
let svgWidth,
    svgHeight,
    chartWidth,
    chartHeight,
    xScale,
    yScale,
    yScalePct,
    line,
    sortOrder,
    sortOrderPct,
    numChartsInRow,
    xAxis,
    currentSortOrder,
    margins = {
      top: 50,
      right: 80,
      bottom: 20,
      left: 80
    };

// Chart components
let $container,
    $svg,
    $g,
    $charts,
    $paths,
    $titles,
    $xAxisGroups;

function init() {
  loadData(['tidal.json'])
    .then(([d, total_props]) => {
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
            'year': 2018,
            'value': +county.value_impactedem18
          },
          {
            'year': 2023,
            'value': +county.value_impactedem23
          },
          {
            'year': 2028,
            'value': +county.value_impactedem28
          },
          {
            'year': 2033,
            'value': +county.value_impactedem33
          },
        ]
      });

      sortOrder = data.sort((a, b) => {
        return +b.value_impactedem23 - +a.value_impactedem23;
      }).map(e => e.situs_county);

      currentSortOrder = sortOrder;

      constructChart();
    });
}

function constructChart() {
  xScale = d3.scalePoint()
    .domain(data[0].lineValues.map(e => e.year).sort());

  yScale = d3.scaleLinear()
    .domain([0, d3.max(data.map(e => +e.value_impactedem33))]);

  yScalePct = d3.scaleLinear()
    .domain([0, 0.05]);

  line = d3.line()
    .x(d => xScale(d.year) + margins.left)
    .y(d => yScale(d.value))
    .curve(d3.curveStepAfter);

  xAxis = d3.axisBottom(xScale)
    .tickPadding(10)
    .tickFormat(t => `‘${t.toString().slice(2)}`);

  $container = d3.select(containerSelector);

  $svg = $container.append('svg');

  $charts = $svg.selectAll('.tidal-sm')
    .data(data)
    .enter()
    .append('g')
    .classed('tidal-sm', true);

  $xAxisGroups = $charts.append('g')
    .classed('x axis', true);

  $paths = $charts.selectAll('.line')
    .data(d => [d.lineValues])
    .enter()
    .append('path')
    .classed('line', true);

  $titles = $charts
    .append('text')
    .text(d => `${d.situs_county} County`)
    .attr('text-anchor', 'middle')
    .style('fill', 'white')
    .classed('sm-title', true);

  resize();
}

function renderChart(duration = 0) {
  $svg.attr('width', svgWidth)
    .attr('height', svgHeight);

  $charts
    .transition()
    .duration(duration)
    .delay(duration)
    .attr('transform', (d) => {
    let i = currentSortOrder.indexOf(d.situs_county);

    let rowIndex = Math.floor(i / numChartsInRow);
    let colIndex = i - (rowIndex * numChartsInRow);

    let w = chartWidth + margins.left + margins.right;
    let h = chartHeight + margins.top + margins.bottom;

    return `translate(${colIndex * w},${rowIndex * h})`
  });

  $titles
    .attr('x', (chartWidth / 2) + margins.left)
    .attr('y', 25);

  $xAxisGroups
    .transition()
    .duration(duration)
    .attr('transform', `translate(${margins.left}, ${chartHeight})`)
    .call(xAxis.tickSize(-(chartHeight - margins.top)));

  $paths
    .transition()
    .duration(duration)
    .attr('d', d => line(d));
}

function resize() {
  svgWidth = $container.node().getBoundingClientRect().width;

  numChartsInRow = Math.floor(svgWidth / minChartWidth);

  chartWidth = (svgWidth / numChartsInRow) - margins.left - margins.right;
  chartHeight = (chartWidth * chartAspectRatio) - margins.top - margins.bottom;

  svgHeight = Math.ceil(data.length / numChartsInRow) * (chartHeight + margins.top + margins.bottom);

  xScale.range([0, chartWidth]);
  yScale.range([chartHeight, margins.top]);
  yScalePct.range([chartHeight, margins.top]);

  renderChart();
}

export default {
  init,
  resize
}

