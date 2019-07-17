import loadData from './load-data';

let data;

// constants
const containerSelector = '#wind-sm';
const minChartWidth = 250;
const chartAspectRatio = 1.2;

// Scales and measures
let svgWidth,
    svgHeight,
    chartWidth,
    chartHeight,
    xScale,
    yScale,
    line,
    area,
    sortOrder,
    numChartsInRow,
    xAxis,
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
    $xAxisGroups;

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

      data.forEach(county => {
        county.lineValues = [
          {
            'year': 1985,
            'value_17': county['expected_rcp85_hurricane_wind_exposure_1979_1989_q0.17'],
            'value_50': county['expected_rcp85_hurricane_wind_exposure_1979_1989_q0.50'],
            'value_83': county['expected_rcp85_hurricane_wind_exposure_1979_1989_q0.83'],
          },
          {
            'year': 2018,
            'value_17': county['expected_rcp85_hurricane_wind_exposure_2008_2018_q0.17'],
            'value_50': county['expected_rcp85_hurricane_wind_exposure_2008_2018_q0.50'],
            'value_83': county['expected_rcp85_hurricane_wind_exposure_2008_2018_q0.83'],
          },
          {
            'year': 2050,
            'value_17': county['expected_rcp85_hurricane_wind_exposure_2045_2055_q0.17'],
            'value_50': county['expected_rcp85_hurricane_wind_exposure_2045_2055_q0.50'],
            'value_83': county['expected_rcp85_hurricane_wind_exposure_2045_2055_q0.83'],
          }
        ]
      })

      sortOrder = data.sort((a, b) => {
        return b['expected_rcp85_hurricane_wind_exposure_2045_2055_q0.50'] - a['expected_rcp85_hurricane_wind_exposure_2045_2055_q0.50'];
      }).map(e => e.situs_county);

      constructChart();
    });
}

function constructChart() {
  xScale = d3.scalePoint()
    .domain(data[0].lineValues.map(e => e.year).sort());

  yScale = d3.scaleLinear()
    .domain([0, d3.max(data.map(e => e['expected_rcp85_hurricane_wind_exposure_2045_2055_q0.50']))]);

  line = d3.line()
    .x(d => xScale(d.year) + margins.left)
    .y(d => yScale(d.value_50));

  area = d3.area()
    .x(d => xScale(d.year) + margins.left)
    .y0(d => yScale(d.value_17))
    .y1(d => yScale(d.value_83));

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

  $xAxisGroups = $charts.append('g')
    .classed('x axis', true);

  $fills = $charts.selectAll('.fill')
    .data(d => [d.lineValues])
    .enter()
    .append('path')
    .classed('fill', true);

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

function renderChart() {
  $svg.attr('width', svgWidth)
    .attr('height', svgHeight);

  $charts.attr('transform', (d) => {
    let i = sortOrder.indexOf(d.situs_county);

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
    .attr('transform', `translate(${margins.left}, ${chartHeight})`)
    .call(xAxis.tickSize(-(chartHeight - margins.top)));

  $paths.attr('d', d => line(d));
  $fills.attr('d', d => area(d));
}

function resize() {
  svgWidth = $container.node().getBoundingClientRect().width;

  numChartsInRow = Math.floor(svgWidth / minChartWidth);

  chartWidth = (svgWidth / numChartsInRow) - margins.left - margins.right;
  chartHeight = (chartWidth * chartAspectRatio) - margins.top - margins.bottom;

  svgHeight = Math.ceil(data.length / numChartsInRow) * (chartHeight + margins.top + margins.bottom);

  xScale.range([0, chartWidth]);
  yScale.range([chartHeight, margins.top]);

  renderChart();
}

export default {
  init,
  resize
}

