import loadData from './load-data';

let data;

d3.select('#sm-toggle')
  .on('change', function() {
   if (this.checked) {
    switchToPct();
   } else {
    switchToTotal();
   }
  })

// constants
const containerSelector = '#wind-sm';
const minChartWidth = 250;
const chartAspectRatio = 1.4;

// Scales and measures
let svgWidth,
    svgHeight,
    chartWidth,
    chartHeight,
    xScale,
    yScale,
    yScalePct,
    line,
    area,
    sortOrder,
    sortOrderPct,
    numChartsInRow,
    xAxis,
    yAxis,
    currentSortOrder,
    margins = {
      top: 50,
      right: 40,
      bottom: 20,
      left: 40
    };

// Chart components
let $container,
    $svg,
    $g,
    $charts,
    $paths,
    $fills,
    $titles,
    $values,
    $xAxisGroups,
    $yAxisGroups,
    $bars,
    $chartBgs;

function init() {
  loadData(['winds_county.json', 'property_counts.json'])
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
            'year': 1985,
            'value_17': county['expected_rcp85_hurricane_wind_exposure_1979_1989_q0.17'],
            'value_50': county['expected_rcp85_hurricane_wind_exposure_1979_1989_q0.50'],
            'value_83': county['expected_rcp85_hurricane_wind_exposure_1979_1989_q0.83'],
            'pct_17': county['expected_rcp85_hurricane_wind_exposure_1979_1989_q0.17'] / total_props[county.situs_county],
            'pct_50': county['expected_rcp85_hurricane_wind_exposure_1979_1989_q0.50'] / total_props[county.situs_county],
            'pct_83': county['expected_rcp85_hurricane_wind_exposure_1979_1989_q0.83'] / total_props[county.situs_county],
          },
          {
            'year': 2018,
            'value_17': county['expected_rcp85_hurricane_wind_exposure_2008_2018_q0.17'],
            'value_50': county['expected_rcp85_hurricane_wind_exposure_2008_2018_q0.50'],
            'value_83': county['expected_rcp85_hurricane_wind_exposure_2008_2018_q0.83'],
            'pct_17': county['expected_rcp85_hurricane_wind_exposure_2008_2018_q0.17'] / total_props[county.situs_county],
            'pct_50': county['expected_rcp85_hurricane_wind_exposure_2008_2018_q0.50'] / total_props[county.situs_county],
            'pct_83': county['expected_rcp85_hurricane_wind_exposure_2008_2018_q0.83'] / total_props[county.situs_county],
          }
        ]
      });

      sortOrder = data.sort((a, b) => {
        return b['expected_rcp85_hurricane_wind_exposure_2045_2055_q0.50'] - a['expected_rcp85_hurricane_wind_exposure_2045_2055_q0.50'];
      }).map(e => e.situs_county);

      sortOrderPct = data.sort((a, b) => {
        return (b['expected_rcp85_hurricane_wind_exposure_2045_2055_q0.50'] / total_props[b.situs_county]) - (a['expected_rcp85_hurricane_wind_exposure_2045_2055_q0.50'] / total_props[a.situs_county]);
      }).map(e => e.situs_county);

      currentSortOrder = sortOrder;

      constructChart();
    });
}

function constructChart() {
  xScale = d3.scaleBand()
    .domain(data[0].lineValues.map(e => e.year).sort((a, b) => a - b));

  yScale = d3.scaleLinear()
    .domain([d3.max(data.map(e => e['expected_rcp85_hurricane_wind_exposure_2045_2055_q0.83'])), 0]);

  yScalePct = d3.scaleLinear()
    .domain([0, 0.05]);

  line = d3.line()
    .x(d => xScale(d.year) + margins.left)
    .y(d => yScale(d.value_50));

  area = d3.area()
    .x(d => xScale(d.year) + margins.left)
    .y0(d => yScale(d.value_17))
    .y1(d => yScale(d.value_83));

  yAxis = d3.axisLeft(yScale)
    .tickPadding(10)
    .ticks(3)
    .tickFormat(function (d) {
      if ((d / 1000) >= 1) {
        d = d / 1000 + "K";
      }
      return d;
    })

  xAxis = d3.axisBottom(xScale)
    .tickPadding(10)
    .tickFormat(t => `‘${t.toString().slice(2)}`);

  $container = d3.select(containerSelector);

  $svg = $container.append('svg');

  $charts = $svg.selectAll('.wind-sm')
    .data(data)
    .enter()
    .append('g')
    .classed('wind-sm', true);

  $chartBgs = $charts.append('rect')
    .classed('chart-bg', true)
    .attr('rx', 5);

  $yAxisGroups = $charts.append('g')
    .classed('y axis', true);

  $xAxisGroups = $charts.append('g')
    .classed('x axis', true);

  $bars = $charts.selectAll('.bar')
    .data(d => d.lineValues)
    .enter()
    .append('rect')
    .style('opacity', d => d.year === 1985 ? 0.5 : 1)
    .classed('bar', true);

  let format = d3.format(',.0f');

  $values = $charts.selectAll('.value')
    .data(d => d.lineValues)
    .enter()
    .append('text')
    .text(d => format(d.value_50))
    .attr('text-anchor', 'middle')
    .classed('value', true);

  /*$fills = $charts.selectAll('.fill')
    .data(d => [d.lineValues])
    .enter()
    .append('path')
    .classed('fill', true);

  $paths = $charts.selectAll('.line')
    .data(d => [d.lineValues])
    .enter()
    .append('path')
    .classed('line', true);*/

    /*
  $leftBars = $charts.append('rect')
    .classed('left-bar', true);


  $rightBars = $charts.append('rect')
    .classed('right-bar', true);
    */

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

  $yAxisGroups
    .transition()
    .duration(duration)
    .attr('transform', `translate(${margins.left}, 0)`)
    .call(yAxis.tickSize(-(chartWidth)));

  $bars
    .attr('x', d => xScale(d.year) + (xScale.bandwidth() / 2))
    .attr('y', d => yScale(d.value_50))
    .attr('width', xScale.bandwidth())
    .attr('height', d => chartHeight - yScale(d.value_50));

  $values
    .attr('x', d => xScale(d.year) + (xScale.bandwidth()))
    .attr('y', d => yScale(d.value_50) - 10)

  $chartBgs
    .attr('width', chartWidth + margins.left + margins.right - 20)
    .attr('height', chartHeight + margins.top + margins.bottom - 20)
    .attr('x', 10)
    .attr('y', -12)
 /* $paths
    .transition()
    .duration(duration)
    .attr('d', d => line(d));

  $fills
    .transition()
    .duration(duration)
    .attr('d', d => area(d));*/
}

function resize() {
  svgWidth = $container.node().getBoundingClientRect().width;

  numChartsInRow = Math.floor(svgWidth / minChartWidth);

  chartWidth = (svgWidth / numChartsInRow) - margins.left - margins.right;
  chartHeight = (chartWidth * chartAspectRatio) - margins.top - margins.bottom;

  svgHeight = Math.ceil(data.length / numChartsInRow) * (chartHeight + margins.top + margins.bottom);

  xScale.range([0, chartWidth]).padding(.1);
  yScale.range([margins.top, chartHeight]);
  yScalePct.range([chartHeight, margins.top]);

  renderChart();
}

function switchToPct() {
  line.y(d => yScalePct(d.pct_50));

  area
    .y0(d => yScalePct(d.pct_17))
    .y1(d => yScalePct(d.pct_83));

  currentSortOrder = sortOrderPct;

  renderChart(800);
}

function switchToTotal() {
  line.y(d => yScale(d.value_50));

  area
    .y0(d => yScale(d.value_17))
    .y1(d => yScale(d.value_83));

  currentSortOrder = sortOrder;

  renderChart(800);
}

export default {
  init,
  resize
}

