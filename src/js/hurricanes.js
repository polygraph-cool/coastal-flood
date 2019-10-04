import loadData from './load-data';
import enterView from 'enter-view';

let data;

// Whether or not the chart has been animated in
let isVisible = false;

// constants
const containerSelector = '#hurricanes';
const barPadding = 5;
const chartTitle = 'Hurricanes in the United States, 1930-2019';

// Scales and measures
let width,
    height,
    barWidth,
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
    $normalStormRects,
    $majorStormRects,
    $title;

enterView({
  selector: containerSelector,
  offset: 0.5,
  enter: animateChartEnter,
})

function init() {
  loadData(['hurricanes.json']).then(([d]) => {

    // Convert all strings in the objects to numbers by looping over
    // each object and applying to parseInt to each value
    data = d.map(entry => {
      return Object.keys(entry).reduce((obj, key) => {
        obj[key] = parseInt(entry[key]);
        return obj;
      }, {});
    });

    constructChart();
  })
}

function constructChart() {
  // Set up the scales
  let years = data.map(d => d.year);
  let values = data.map(d => d.n_hurricanes);

  xScale = d3.scaleBand()
    .domain(years.sort());

  yScale = d3.scaleLinear()
    .domain([0, d3.max(values)]);

  // Create the main chart elements
  $container = d3.select(containerSelector);

  $svg = $container.append('svg');

  $g = $svg.append('g')
    .attr('transform', `translate(${margins.left}, ${margins.top})`);

  $title = $g.append('text')
    .classed('chart-title', true)
    .text(chartTitle)
    .attr('x', 0)
    .attr('y', 0);

  $majorStormRects = $g.selectAll('.major-storm')
    .data(data)
    .enter()
    .append('rect')
    .style('fill', '#fce25a') // TEMPORARY
    .classed('major-storm', true); 

  $normalStormRects = $g.selectAll('.normal-storm')
    .data(data)
    .enter()
    .append('rect')
    .style('fill', '#302e3b') // TEMPORARY
    .classed('normal-storm', true); 

  resize();
}

function animateChartEnter() {
  isVisible = true;

  $majorStormRects
    .transition()
    .duration(500)
    .delay((d, i) => i * 10)
    .attr('height', d => yScale(d.n_major_hurricanes));

  $normalStormRects
    .transition()
    .duration(500)
    .delay((d, i) => i * 10)
    .attr('height', d => yScale(d.n_hurricanes - d.n_major_hurricanes));
}

function renderChart() {
  $svg
    .attr('width', width + margins.left + margins.right)
    .attr('height', height + margins.top + margins.bottom);

  console.log(yScale(1))

  $majorStormRects
    .attr('x', d => xScale(d.year))
    .attr('y', d => height - yScale(d.n_major_hurricanes))
    .attr('width', barWidth)
    .attr('height', d => isVisible ? yScale(d.n_major_hurricanes) : 0);

  $normalStormRects
    .attr('x', d => xScale(d.year))
    .attr('y', d => height - yScale(d.n_hurricanes - d.n_major_hurricanes) - yScale(d.n_major_hurricanes))
    .attr('width', barWidth)
    .attr('height', d => isVisible ? yScale(d.n_hurricanes - d.n_major_hurricanes) : 0);
}

function resize() {
  let containerWidth = $container.node().getBoundingClientRect().width;

  width = containerWidth - margins.left - margins.right;
  barWidth = (width / data.length) - barPadding
  height = 400 - margins.top - margins.bottom;

  xScale.range([0, width]);
  yScale.range([0, height]);

  renderChart();
}

export default {
  init,
  resize
}