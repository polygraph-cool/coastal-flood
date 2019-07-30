import loadData from './load-data';

let data, njData;

// constants
const containerSelector = '#sea-level';
const barPadding = 5;
const chartTitle = 'Global Average Sea Level, 1990-2019'

// Scales and measures
let width,
    height,
    barWidth,
    xScale,
    yScale,
    line,
    xAxis,
    yAxis,
    margins = {
      top: 60,
      right: 50,
      bottom: 30,
      left: 50
    };

// Chart components
let $container,
    $svg,
    $g,
    $path,
    $njPath,
    $xAxisGroup,
    $yAxisGroup,
    $title;

function init() {
  loadData(['sea_level.json', 'sea_level_nj.json'])
    .then(([d, nj]) => {
      data = parseNumbers(d);
      njData = parseNumbers(nj);

      constructChart();
    });
}

function parseNumbers(d) {
  return d.map(entry => {
      return Object.keys(entry).reduce((obj, key) => {
        obj[key] = parseFloat(entry[key]);
        return obj;
      }, {});
    }).sort((a, b) => a.year - b.year);
}

function constructChart() {
  // Scales
  let years = njData.map(d => d.year);
  let values = data.map(d => d.gmsl);

  xScale = d3.scaleLinear()
    .domain(d3.extent(years));

  yScale = d3.scaleLinear()
    .domain(d3.extent(values));

  xAxis = d3.axisBottom(xScale)
    .tickPadding(10)
    .tickFormat(d3.format(".4"));

  yAxis = d3.axisLeft(yScale)
    .tickPadding(10);

  line = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.gmsl));

  // Chart parts
  $container = d3.select(containerSelector);

  $svg = $container.append('svg');

  $g = $svg.append('g')
    .attr('transform', `translate(${margins.left}, ${margins.top})`);

  $xAxisGroup = $g.append('g')
    .classed('x axis', true);

  $yAxisGroup = $g.append('g')
    .classed('y axis', true);

  $path = $g.append('path')
    .style('fill', 'none')
    .style('stroke', 'white');

  $njPath = $g.append('path')
    .style('fill', 'none')
    .style('stroke', 'orange');

  $title = $g.append('text')
    .classed('chart-title', true)
    .text(chartTitle)
    .attr('x', 0)
    .attr('y', - margins.top + 19);

  resize();
}

function renderChart() {
  $xAxisGroup
    .attr('transform', `translate(0, ${height})`)
    .call(xAxis.tickSize(-height));

  $yAxisGroup.call(yAxis.tickSize(-width))

  $svg
    .attr('width', width + margins.left + margins.right)
    .attr('height', height + margins.top + margins.bottom);

  $path.attr('d', line(data));
  $njPath.attr('d', line(njData));
}

function resize() {
  let containerWidth = $container.node().getBoundingClientRect().width;

  width = containerWidth - margins.left - margins.right;
  height = 450 - margins.top - margins.bottom;

  xScale.range([0, width]);
  yScale.range([height, 0]);

  renderChart();
}

export default {
  init,
  resize
}