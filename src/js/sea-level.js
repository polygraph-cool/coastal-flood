import loadData from './load-data';
import enterView from 'enter-view';

let data, njData;

// constants
const containerSelector = '#sea-level';
const barPadding = 5;
const chartTitle = 'High Tides Are Getting Higher';

enterView({
  selector: containerSelector,
  enter: showDots
});

// Scales and measures
let width,
    height,
    barWidth,
    xScale,
    yScale,
    line,
    meanLine,
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
    $dots,
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
  let values = njData.map(d => d.gmsl);

  xScale = d3.scaleLinear()
    .domain(d3.extent(years));

  yScale = d3.scaleLinear()
    .domain(d3.extent(values));

  xAxis = d3.axisBottom(xScale)
    .tickPadding(10)
    .tickFormat(d3.format(".4"));

  yAxis = d3.axisLeft(yScale)
    .ticks(8)
    .tickPadding(10);

  line = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.gmsl));

  meanLine = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.quadratic_mean))

  // Chart parts
  $container = d3.select(containerSelector);

  $svg = $container.append('svg');

  $g = $svg.append('g')
    .attr('transform', `translate(${margins.left}, ${margins.top})`);

  $xAxisGroup = $g.append('g')
    .classed('x axis', true);

  $yAxisGroup = $g.append('g')
    .classed('y axis', true);
  
  /*$njPath = $g.append('path')
    .style('fill', 'none')
    .style('stroke', '#797979');*/

  $dots = $g.selectAll('circle')
    .data(njData)
    .enter()
    .append('circle')
    .style('fill', 'white')
    .attr('r', 0)
    .style('opacity', 0);

  $path = $g.append('path')
    .classed('mean', true)
    .style('fill', 'none');

  $title = $g.append('text')
    .classed('chart-title', true)
    .text(chartTitle)
    .attr('x', 0)
    .attr('y', - margins.top + 25);

  resize();
}

function showDots() {
  $dots
    .transition()
    .duration(500)
    .delay((d, i) => i * 5)
    .style('opacity', 0.3)
    .attr('r', 2.5);
}

function renderChart() {
  $xAxisGroup
    .attr('transform', `translate(0, ${height})`)
    .call(xAxis.tickSize(-height));

  $yAxisGroup.call(yAxis.tickSize(-width))

  $svg
    .attr('width', width + margins.left + margins.right)
    .attr('height', height + margins.top + margins.bottom);

  $path.attr('d', meanLine(njData));

  $dots.attr('cx', d => xScale(d.year))
    .attr('cy', d => yScale(d.gmsl))
  //$njPath.attr('d', line(njData));
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