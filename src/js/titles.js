let gridX = 20;
let gridY = 14;

import scrollama from 'scrollama';
const scroller = scrollama();

let wraps = d3.selectAll('.split-image-wrap');

function init() {

  startScrollListener();
}

function startScrollListener() {
  scroller
  .setup({
    step: '.split-header-wrap',
    progress: true,
    offset: 0,
    threshold: 0.1
  })
  .onStepProgress(({element, index, progress}) => {
    console.log(progress)

    d3.select(element).select('.split-image-wrap')
      .style('opacity',  1 - (progress * 3));
  })
}

export default {
  init
}
