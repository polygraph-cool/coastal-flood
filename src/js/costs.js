import loadData from './load-data';
import scrollama from 'scrollama';

const scroller = scrollama();

let dotsExpanded = false;
let showingGdp = false;
let data, gdp, values;
let sortedCounties, sortedRaw, sortedGdp;
let highlightedCounty;

// constants
const containerSelector = '#costs-svg-wrap';
const $container = d3.select(containerSelector);

let showing2050 = false;

// Scales and measures
let width,
    height,
    xScale,
    xScaleGdp,
    xScaleZero = () => 0,
    currentXScale,
    yScale,
    line,
    xAxis,
    highAndLowValues2020,
    highAndLowValues2050,
    highAndLowValuesGdp,
    margins = {
      top: 140,
      right: 40,
      bottom: 50,
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
    $xAxisGroup,
    $minValues,
    $maxValues,
    $hoverRect,
    $title;

let poseFns = {
  0: () => {
    dotsExpanded = false;
    currentXScale = xScaleZero;

    $dots2020
      .transition()
      .duration(600)
      .delay((d, i) => 500 + i * 80)
      .attr('cx', d => currentXScale(+d['damage_2020_0.5']))
      .style('opacity', 0)

    $dots2050
      .transition()
      .duration(500)
      .delay((d, i) => 500 + i * 80)
      .attr('cx', d => currentXScale(+d['damage_2050_0.5']))

    $uncertainty2020
      .transition()
      .duration(500)
      .delay((d, i) => (i * 80))
      .attr('x1', d => xScale(+d['damage_2020_0.5']))
      .attr('x2', d => xScale(+d['damage_2020_0.5']))
      .attr('y1', d => getCurrentY(d.situs_county))
      .attr('y2', d => getCurrentY(d.situs_county))
      .style('opacity', showing2050 ? 0.1 : 0.5);
  },
  1: () => {
    if (highlightedCounty) {
      unHighlight();
    }
    unHighlight();
    dotsExpanded = true;
    currentXScale = xScale;
    $dots2020
      .transition()
      .duration(600)
      .delay((d, i) => i * 80)
      .attr('cx', d => currentXScale(+d['damage_2020_0.5']))
      .style('opacity', 1)

    $dots2050
      .transition()
      .duration(500)
      .delay((d, i) => i * 80)
      .attr('cx', d => currentXScale(+d['damage_2050_0.5']))

    $minValues.attr('x', d => currentXScale(+d['damage_2020_0.17']))

    $maxValues.attr('x', d => currentXScale(+d['damage_2020_0.83']))

    $uncertainty2020
      .transition()
      .duration(500)
      .delay((d, i) => 650 + (i * 80))
      .attr('x1', d => xScale(+d['damage_2020_0.17']))
      .attr('x2', d => xScale(+d['damage_2020_0.83']))
      .style('opacity', showing2050 ? 0.1 : 0.5);
  },
  2:() => {
    highlightCounty('Hudson', 500);
  },
  3: () => {
    switchToGdp();
  }
}

scroller
  .setup({
    step: '.costs-step'
  })
  .onStepEnter(({ element, index, direction }) => {
    let pose = parseInt(element.dataset.pose);
    console.log(element)

    d3.selectAll('.costs-step')
      .style('opacity', function() {
        if (this === element) {
          return 1;
        } else {
          return 0.3;
        }
      })

    poseFns[pose]();
    console.log(pose);
  })
  .onStepExit(response => {
    // { element, index, direction }
  });

function init() {
  loadData(['costs.json', 'costs_gdp.json'])
    .then(([d, g]) => {
      values = d;
      gdp = g;

      data = d.map(e => {
        let county = e.situs_county;
        let gdpData = gdp.find(e => e.situs_county === county);
        Object.keys(gdpData).forEach(key => {
          e[`gdp_${key}`] = gdpData[key];
        });
        return e;
      })

      sortedRaw = sortBy(data, 'damage_2020_0.5');
      sortedGdp = sortBy(gdp, 'damage_2020_0.5');
      sortedCounties = sortedRaw;
      constructChart();
    });
}

function sortBy(data, column) {
  return data.sort((a, b) => +b[column] - +a[column]).map(e => e.situs_county);
}

function switchToGdp() {
  sortedCounties = sortedGdp;
  currentXScale = xScaleGdp;
  showingGdp = true;

  xAxis.scale(currentXScale)
    .tickFormat(d => d3.format("0.1%")(d));

  $xAxisGroup
    .transition()
    .duration(1000)
    .call(xAxis.tickSize(-height));

  let key2020_05 = showingGdp ? 'gdp_damage_2020_0.5' : 'damage_2020_0.5';
  let key2020_17 = showingGdp ? 'gdp_damage_2020_0.17' : 'damage_2020_0.17';
  let key2020_83 = showingGdp ? 'gdp_damage_2020_0.83' : 'damage_2020_0.83';

  $dots2020
    .transition()
    .duration(500)
    .delay((d, i) => i * 50)
    .attr('cx', d => currentXScale(+d[key2020_05]))
    .end()
    .then(() => {
      $dots2020
        .transition()
        .duration(200)
        .delay((d) => sortedCounties.indexOf(d.situs_county) * 50)
        .attr('cy', (d) => getCurrentY(d.situs_county))
    })

  $minValues
    .attr('x', d => currentXScale(+d[key2020_17]))
    .attr('y', (d) => getCurrentY(d.situs_county))
    .style('opacity', 0)

  $maxValues
    .attr('x', d => currentXScale(+d[key2020_83]))
    .attr('y', (d) => getCurrentY(d.situs_county))
    .style('opacity', 0)

  $uncertainty2020
    .transition()
    .duration(500)
    .delay((d, i) => i * 50)
    .attr('x1', d => {
      if (dotsExpanded) {
        return currentXScale(+d[key2020_17])
      } else {
        return currentXScale(+d[key2020_05])
      }
    })
    .attr('x2', d => {
      if (dotsExpanded) {
        return currentXScale(+d[key2020_83])
      } else {
        return currentXScale(+d[key2020_05])
      }
    })
    .end()
    .then(() => {
      $uncertainty2020
        .transition()
        .duration(200)
        .delay((d) => sortedCounties.indexOf(d.situs_county) * 50)
        .attr('y1', d => getCurrentY(d.situs_county))
        .attr('y2', d => getCurrentY(d.situs_county))
    })

  $countyLabels
    .transition()
    .duration(500)
    .delay((d, i) => i * 50)
    .attr('x', d => -20)
    .end()
    .then(() => {
      $countyLabels
        .transition()
        .duration(200)
        .delay((d) => sortedCounties.indexOf(d.situs_county) * 50)
        .attr('y', (d) => getCurrentY(d.situs_county))
    })
    
}


function constructChart() {
   d3.selectAll('.costs-step')
      .style('opacity', 0.3);

  highAndLowValues2020 = data.reduce((arr, e) => {
    arr = arr.concat([+e['damage_2020_0.83'], +e['damage_2020_0.17']]);
    return arr;
  }, []);

  highAndLowValues2050 = data.reduce((arr, e) => {
    arr = arr.concat([+e['damage_2050_0.83'], +e['damage_2020_0.17']]);
    return arr;
  }, []);

  highAndLowValuesGdp = gdp.reduce((arr, e) => {
    arr = arr.concat([+e['damage_2020_0.83'], +e['damage_2020_0.17']]);
    return arr;
  }, []);

  xScaleGdp = d3.scaleLog()
    .domain(d3.extent(highAndLowValuesGdp))

  xScale = d3.scaleLog()
    .domain(d3.extent(highAndLowValues2020));

  currentXScale = xScale;
    
  yScale = d3.scaleLinear()
    .domain([0, data.length - 1]);

  xAxis = d3.axisTop()
    .scale(currentXScale)
    .ticks(3)
    .tickPadding(20)
    .tickFormat(d => '+$' + d3.format("0.2s")(d).replace(/G/, "B"));

  $svg = $container.append('svg');

  $g = $svg.append('g')
    .attr('transform', `translate(${margins.left}, ${margins.top})`);

  $xAxisGroup = $g.append('g')
    .classed('x axis', true);


  $title = $svg.append('text')
    .text('Costs of Climate Change')
    .attr('text-anchor', 'middle')
    .classed('costs-title', true)

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

  $minValues = $g.selectAll('.min-value')
    .data(data)
    .enter()
    .append('text')
    .classed('min-value', true);
    
  $minValues.append('tspan')
    .classed('value-label', true)
    .attr('dx', '-5')
    .text('MIN   ')

  $minValues.append('tspan')
    .classed('value-num', true)
    .text(d => '$' + d3.format("0.2s")(d['damage_2020_0.17']).replace(/G/, "B"))

  $maxValues = $g.selectAll('.max-value')
    .data(data)
    .enter()
    .append('text')
    .classed('max-value', true)

  $maxValues.append('tspan')
    .classed('value-num', true)
    .text(d => '$' + d3.format("0.2s")(d['damage_2020_0.83']).replace(/G/, "B"))

  $maxValues.append('tspan')
    .classed('value-label', true)
    .attr('dx', '5')
    .text('MAX')

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

  $hoverRect = $g.append('rect')
    .on('mousemove', handleMouseMove)
    .on('mouseleave', handleMouseLeave)
    .classed('costs-hover-rect', true)
    .style('fill', 'transparent');

  resize();
}



function handleMouseMove() {
  let [x, y] = d3.mouse(this);
  let countyIndex = Math.round(yScale.invert(y));
  let county = sortedCounties[countyIndex];
  highlightCounty(county);
}

function handleMouseLeave() {
  unHighlight();
}

function unHighlight() {
  if (!dotsExpanded) return;
  highlightedCounty = null;

  $dots2020
      .transition()
      .duration(100)
      .style('opacity', 1)

  $uncertainty2020
    .transition()
    .duration(100)
    .style('opacity', 1)

  $countyLabels
    .transition()
    .duration(100)
    .style('opacity', 1)

  $minValues
    .transition()
    .duration(230)
    .attr('transform', 'translate(0, 0)')
    .style('opacity', 0)

  $maxValues
    .transition()
    .duration(230)
    .attr('transform', 'translate(0, 0)')
    .style('opacity', 0)
}

function highlightCounty(county, duration=100) {
  if (highlightedCounty === county || !dotsExpanded) return;
  highlightedCounty = county;

  $dots2020
    .transition()
    .duration(duration)
    .style('opacity', d => d.situs_county === county ? 1 : 0.2)

  $uncertainty2020
    .transition()
    .duration(duration)
    .style('opacity', d => d.situs_county === county ? 1 : 0.2)

  $countyLabels
    .transition()
    .duration(duration)
    .style('opacity', d => d.situs_county === county ? 1 : 0.2)

  $minValues
    .transition()
    .duration(230)
    .delay(duration - 100)
    .attr('transform', d => d.situs_county === county ? 'translate(-5, 0)' : 'translate(0, 0)')
    .style('opacity', d => d.situs_county === county ? 1 : 0)

  $maxValues
    .transition()
    .duration(230)
    .delay(duration - 100)
    .attr('transform', d => d.situs_county === county ? 'translate(5, 0)' : 'translate(0, 0)')
    .style('opacity', d => d.situs_county === county ? 1 : 0)
}

function getCurrentY(county) {
  return yScale(sortedCounties.indexOf(county));
} 

function renderChart(duration = 0) {
  $svg.attr('width', width + margins.left + margins.right)
    .attr('height', height + margins.top + margins.bottom);

  $xAxisGroup
    .transition()
    .duration(duration)
    .call(xAxis.tickSize(-height));

  $hoverRect
    .attr('width', width + 200)
    .attr('x', -200)
    .attr('height', height);

  let key2020_05 = showingGdp ? 'gdp_damage_2020_0.5' : 'damage_2020_0.5';
  let key2020_17 = showingGdp ? 'gdp_damage_2020_0.17' : 'damage_2020_0.17';
  let key2020_83 = showingGdp ? 'gdp_damage_2020_0.83' : 'damage_2020_0.83';

  $title.attr('x', width / 2)
    .attr('y', 50)

  $dots2020
    .transition()
    .duration(duration)
    .attr('cx', d => currentXScale(+d[key2020_05]))
    .attr('cy', (d) => getCurrentY(d.situs_county))
    .style('opacity', dotsExpanded ? 1 : 0)

  $dots2050
    .transition()
    .duration(duration)
    .attr('cx', d => currentXScale(+d['damage_2050_0.5']))
    .attr('cy', (d) => getCurrentY(d.situs_county))
    .style('opacity', showing2050 ? 1 : 0)

  $minValues
    .attr('x', d => currentXScale(+d[key2020_17]))
    .attr('y', (d) => getCurrentY(d.situs_county))
    .style('opacity', 0)

  $maxValues
    .attr('x', d => currentXScale(+d[key2020_83]))
    .attr('y', (d) => getCurrentY(d.situs_county))
    .style('opacity', 0)

  $uncertainty2020
    .transition()
    .duration(duration)
    .attr('x1', d => {
      if (dotsExpanded) {
        return currentXScale(+d[key2020_17])
      } else {
        return currentXScale(+d[key2020_05])
      }
    })
    .attr('x2', d => {
      if (dotsExpanded) {
        return currentXScale(+d[key2020_83])
      } else {
        return currentXScale(+d[key2020_05])
      }
    })
    .attr('y1', d => getCurrentY(d.situs_county))
    .attr('y2', d => getCurrentY(d.situs_county))
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
    .attr('y1', d => getCurrentY(d.situs_county))
    .attr('y2', d => getCurrentY(d.situs_county))
    .style('opacity', showing2050 ? 0.5 : 0);

  $countyLabels
    .transition()
    .duration(duration)
    .attr('x', d => -20)
    .attr('y', (d) => getCurrentY(d.situs_county))
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

  xScaleGdp.range([0, width])
  xScale.range([0, width]);
  yScale.range([0, height]);

  renderChart();
}

export default {
  init,
  resize
}

