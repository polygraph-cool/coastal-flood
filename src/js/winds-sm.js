import loadData from './load-data';

let data;

// constants
const containerSelector = '#winds-sm';

// Scales and measures
let svgWidth,
    svgHeight,
    chartWidth,
    chartHeight,
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
    $charts;

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

      constructChart();
    });
}

function constructChart() {

}

function renderChart() {

}

function resize() {

}

export default {
  init,
  resize
}

