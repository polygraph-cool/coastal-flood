import loadData from './load-data';

let data;
let sortedCounties;

// constants
const containerSelector = '#costs-svg-wrap';
const $container = d3.select(containerSelector);

let showing2050 = false;

// Scales and measures
let width,
    height,
    xScale,
    yScale,
    line,
    xAxis,
    highAndLowValues2020,
    highAndLowValues2050,
    margins = {
      top: 50,
      right: 40,
      bottom: 20,
      left: 40
    };

// Chart components
let $svg,
    $g,
    $charts,
    $paths,
    $titles,
    $dots2020,
    $dots2050,
    $uncertainty2020,
    $uncertainty2050,
    $countyLabels,
    $xAxisGroup;

function init() {
  loadData(['costs.json'])
    .then(([d]) => {
      data = d;

      sortedCounties = sortBy(data, 'damage_2020_0.5');
      console.log(sortedCounties)
      constructChart();
    });
}

function sortBy(data, column) {
  return data.sort((a, b) => +b[column] - +a[column]).map(e => e.situs_county);
}


function constructChart() {
  highAndLowValues2020 = data.reduce((arr, e) => {
    arr = arr.concat([+e['damage_2020_0.83'], +e['damage_2020_0.17']]);
    return arr;
  }, []);

  highAndLowValues2050 = data.reduce((arr, e) => {
    arr = arr.concat([+e['damage_2050_0.83'], +e['damage_2020_0.17']]);
    return arr;
  }, []);

  xScale = d3.scaleLinear()
    .domain(d3.extent(highAndLowValues2020));
    
  yScale = d3.scaleLinear()
    .domain([0, data.length - 1]);

  xAxis = d3.axisTop()
    .scale(xScale)
    .ticks(6)
    .tickPadding(20)
    .tickFormat(d => '$' + d3.format("0.2s")(d).replace(/G/, "B"));

  $svg = $container.append('svg');

  $g = $svg.append('g')
    .attr('transform', `translate(${margins.left}, ${margins.top})`);

  $xAxisGroup = $g.append('g')
    .classed('x axis', true);

  $countyLabels = $g.selectAll('.county-label')
    .data(data)
    .enter()
    .append('text')
    .classed('county-label', true)
    .attr('text-anchor', 'end')
    .text(d => d.situs_county);

  $uncertainty2020 = $g.selectAll('.uncertainty-2020')
    .data(data)
    .enter()
    .append('line')
    .classed('uncertainty-2020', true)
    .attr('stroke-width', 3)
    .style('stroke', '#e36f22')
    .style('opacity', 0.5);

  $uncertainty2050 = $g.selectAll('.uncertainty-2050')
    .data(data)
    .enter()
    .append('line')
    .classed('uncertainty-2050', true)
    .attr('stroke-width', 3)
    .style('stroke', '#e36f22')
    .style('opacity', 0);

  $dots2020 = $g.selectAll('.dot-2020')
    .data(data)
    .enter()
    .append('circle')
    .classed('dot-2020', true)
    .attr('r', 6)
    .style('fill', '#e36f22');

  $dots2050 = $g.selectAll('.dot-2050')
    .data(data)
    .enter()
    .append('circle')
    .classed('dot-2050', true)
    .attr('r', 6)
    .style('fill', '#e36f22')
    .style('opacity', 0);

  resize();
}

function renderChart(duration = 0) {
  $svg.attr('width', width)
    .attr('height', height);

  $xAxisGroup
    .transition()
    .duration(duration)
    .call(xAxis.tickSize(-height));

  $dots2020
    .transition()
    .duration(duration)
    .attr('cx', d => xScale(+d['damage_2020_0.5']))
    .attr('cy', (d) => yScale(sortedCounties.indexOf(d.situs_county)))
    .style('opacity', showing2050 ? 0.3 : 1)

  $dots2050
    .transition()
    .duration(duration)
    .attr('cx', d => xScale(+d['damage_2050_0.5']))
    .attr('cy', (d) => yScale(sortedCounties.indexOf(d.situs_county)))
    .style('opacity', showing2050 ? 1 : 0)

  $uncertainty2020
    .transition()
    .duration(duration)
    .attr('x1', d => xScale(+d['damage_2020_0.17']))
    .attr('x2', d => xScale(+d['damage_2020_0.83']))
    .attr('y1', d => yScale(sortedCounties.indexOf(d.situs_county)))
    .attr('y2', d => yScale(sortedCounties.indexOf(d.situs_county)))
    .style('opacity', showing2050 ? 0.1 : 0.5);

  $uncertainty2050
    .transition()
    .duration(duration)
    .attr('x1', d => {
      if (showing2050) {
        return xScale(+d['damage_2050_0.17'])
      } else {
        return xScale(+d['damage_2050_0.5'])
      }
      
    })
    .attr('x2', d => {
      if (showing2050) {
        return xScale(+d['damage_2050_0.83'])
      } else {
        return xScale(+d['damage_2050_0.5'])
      }
    })
    .attr('y1', d => yScale(sortedCounties.indexOf(d.situs_county)))
    .attr('y2', d => yScale(sortedCounties.indexOf(d.situs_county)))
    .style('opacity', showing2050 ? 0.5 : 0);

  $countyLabels
    .transition()
    .duration(duration)
    .attr('x', d => -20)
    .attr('y', (d) => yScale(sortedCounties.indexOf(d.situs_county)))
}

function show2050() {
  xScale.domain(d3.extent(highAndLowValues2050));

  showing2050 = true;

  renderChart(1000);
}

function hide2050() {
  xScale.domain(d3.extent(highAndLowValues2020));

  showing2050 = false;

  renderChart(1000);
}

window.show2050 = show2050;
window.hide2050 = hide2050;

function resize() {
  width = $container.node().getBoundingClientRect().width - margins.left - margins.right;
  height = $container.node().getBoundingClientRect().height - margins.top - margins.bottom;

  xScale.range([0, width]);
  yScale.range([0, height]);

  renderChart();
}

export default {
  init,
  resize
}

