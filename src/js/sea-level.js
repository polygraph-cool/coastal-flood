import loadData from './load-data';

let data;

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
    $path,
    $title;

function init() {
  loadData(['sea-level.json'])
    .then(([d]) => {
      data = d.map(entry => {
        return Object.keys(entry).reduce((obj, key) => {
          obj[key] = parseFloat(entry[key]);
          return obj;
        }, {});
      }).sort((a, b) => a.year - b.year);

      console.log(data)

      constructChart();
    });
}

function constructChart() {
  // Scales
  let years = data.map(d => d.year);
  let values = data.map(d => d.gmsl);

  xScale = d3.scaleLinear()
    .domain(d3.extent(years));

  yScale = d3.scaleLinear()
    .domain(d3.extent(values));

  line = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.gmsl));

  // Chart parts
  $container = d3.select(containerSelector);

  $svg = $container.append('svg');

  $g = $svg.append('g')
    .attr('transform', `translate(${margins.left}, ${margins.top})`);

  $path = $g.append('path')
    .style('fill', 'none')
    .style('stroke', 'white');

  $title = $g.append('text')
    .classed('chart-title', true)
    .text(chartTitle)
    .attr('x', 0)
    .attr('y', 0);

  resize();
}

function renderChart() {
  $svg
    .attr('width', width + margins.left + margins.right)
    .attr('height', height + margins.top + margins.bottom);

  $path.attr('d', line(data));
}

function resize() {
  let containerWidth = $container.node().getBoundingClientRect().width;

  width = containerWidth - margins.left - margins.right;
  height = 350 - margins.top - margins.bottom;

  xScale.range([0, width]);
  yScale.range([height, 0]);

  renderChart();
}

export default {
  init,
  resize
}