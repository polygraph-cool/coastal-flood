import loadData from './load-data';

let data,
  barPoints;

// constants
const containerSelector = '#wind-main__chart__svg';

// Scales and measures
let width,
    height,
    xScale,
    yScaleProps,
    yScaleValues,
    currentScale,
    line,
    area,
    sortOrder,
    numChartsInRow,
    xAxis,
    yAxis,
    margins = {
      top: 50,
      right: 40,
      bottom: 20,
      left: 40
    };

let $container,
    $svg,
    $g,
    $charts,
    $path,
    $fill,
    $xAxisGroup,
    $yAxisGroup,
    $bars;

function init() {
  loadData(['winds_county.json'])
    .then(([d]) => {
      data = d.map(entry => {
        return Object.keys(entry).reduce((obj, key) => {
          if (!(key === 'situs_county' || key === 'situs_state_code')) {
            obj[key] = parseFloat(entry[key]);
          }
          return obj;
        }, {});
      }).sort((a, b) => a.year - b.year);

      data = data.reduce((obj, e) => {
        Object.keys(e).forEach(key => {
          obj[key] = obj[key] || 0;
          obj[key] += e[key];
        });

        return obj;
      }, {});

      data = [
          {
            'year': 1985,
            'value_17': data['expected_rcp85_hurricane_wind_exposure_1979_1989_q0.17'],
            'value_50': data['expected_rcp85_hurricane_wind_exposure_1979_1989_q0.50'],
            'value_83': data['expected_rcp85_hurricane_wind_exposure_1979_1989_q0.83'],
            'cost_17': data['value_expected_rcp85_hurricane_wind_exposure_1979_1989_q0.17'],
            'cost_50': data['value_expected_rcp85_hurricane_wind_exposure_1979_1989_q0.50'],
            'cost_83': data['value_expected_rcp85_hurricane_wind_exposure_1979_1989_q0.83'],
          },
          {
            'year': 2018,
            'value_17': data['expected_rcp85_hurricane_wind_exposure_2008_2018_q0.17'],
            'value_50': data['expected_rcp85_hurricane_wind_exposure_2008_2018_q0.50'],
            'value_83': data['expected_rcp85_hurricane_wind_exposure_2008_2018_q0.83'],
            'cost_17': data['value_expected_rcp85_hurricane_wind_exposure_2008_2018_q0.17'],
            'cost_50': data['value_expected_rcp85_hurricane_wind_exposure_2008_2018_q0.50'],
            'cost_83': data['value_expected_rcp85_hurricane_wind_exposure_2008_2018_q0.83'],
          },
          {
            'year': 2050,
            'value_17': data['expected_rcp85_hurricane_wind_exposure_2045_2055_q0.17'],
            'value_50': data['expected_rcp85_hurricane_wind_exposure_2045_2055_q0.50'],
            'value_83': data['expected_rcp85_hurricane_wind_exposure_2045_2055_q0.83'],
            'cost_17': data['value_expected_rcp85_hurricane_wind_exposure_2045_2055_q0.17'],
            'cost_50': data['value_expected_rcp85_hurricane_wind_exposure_2045_2055_q0.50'],
            'cost_83': data['value_expected_rcp85_hurricane_wind_exposure_2045_2055_q0.83'],
          }
        ]

      barPoints = data.reduce((arr, e) => {
        arr = arr.concat([
          {year: e.year, value: e.value_17},
          {year: e.year, value: e.value_50},
          {year: e.year, value: e.value_83},
        ]);

        return arr;
      }, [])

      console.log(barPoints)

      constructChart();
    });
}

function constructChart() {
  xScale = d3.scalePoint()
    .domain(data.map(e => e.year).sort());

  yScaleProps = d3.scaleLinear()
    .domain([0, d3.max(data.map(e => e.value_83))]);

  yScaleValues = d3.scaleLinear()
    .domain([0, d3.max(data.map(e => e.cost_83))]);

  line = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScaleProps(d.value_50));

  area = d3.area()
    .x(d => xScale(d.year))
    .y0(d => yScaleProps(d.value_17))
    .y1(d => yScaleProps(d.value_83));

  xAxis = d3.axisBottom(xScale)
    .tickPadding(10)
    .tickFormat(t => `‘${t.toString().slice(2)}`);

  yAxis = d3.axisLeft(yScaleProps)
    .tickPadding(10)
    .tickFormat(d3.format(".0s"));;

  $container = d3.select(containerSelector);

  $svg = $container.append('svg');

  $g = $svg.append('g')
    .attr('transform', `translate(${margins.left}, ${margins.top})`);

  $xAxisGroup = $g.append('g')
    .classed('x axis', true);

  $yAxisGroup = $g.append('g')
    .classed('y axis', true);

  $fill = $g.selectAll('.fill')
    .data([data])
    .enter()
    .append('path')
    .classed('fill', true);

  $path = $g.selectAll('.line')
    .data([data])
    .enter()
    .append('path')
    .classed('line', true);

  $bars = $g.selectAll('.bar-wrap')
    .data(barPoints)
    .enter()
    .append('g')
    .classed('bar-wrap', true)
    .style('opacity', 0);

  $bars.append('rect')
    .classed('bar', true)
    .attr('width', 24)
    .attr('height', 4)
    .attr('transform', 'translate(-12, -2)');

  $bars.append('text')
    .classed('bar-text', true)
    .text(d => Number(d.value.toFixed()).toLocaleString())
    .attr('transform', 'translate(24, 4)');

  resize();
}

function renderChart(duration = 0) {
  $svg.attr('width', width + margins.left + margins.right)
    .attr('height', height + margins.top + margins.bottom);

  $bars
    .attr('transform', d => `translate(${xScale(d.year)}, ${yScaleProps(d.value)})`)

  $xAxisGroup
    .transition()
    .duration(duration)
    .attr('transform', `translate(0, ${height})`)
    .call(xAxis.tickSize(-height));

  $yAxisGroup
    .transition()
    .duration(duration)
    .call(yAxis.tickSize(-(width + 15)));

  $path.transition()
    .duration(duration)
    .attr('d', d => line(d));

  $fill.transition()
    .duration(duration)
    .attr('d', d => area(d));
}

function resize() {
  width = $container.node().getBoundingClientRect().width - margins.left - margins.right;
  height = 500 - margins.top - margins.bottom;

  xScale.range([0, width]);
  yScaleProps.range([height, 0]);
  yScaleValues.range([height, 0]);

  renderChart();
}

function highlightYear(year) {
  $path
    .transition()
    .duration(600)
    .style('opacity', year === null ? 1 : 0.2);

  $fill 
    .transition()
    .duration(600)
    .style('opacity', year === null ? 1 : 0.2);

  $bars
    .transition()
    .duration(600)
    .style('opacity', d => d.year === year ? 1 : 0);
}

window.highlightYear = highlightYear;

export default {
  init,
  resize
}