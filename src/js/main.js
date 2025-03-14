/* global d3 */
import debounce from 'lodash.debounce';
import seaLevel from './sea-level';
import tidal from './tidal-regl';
import windMap from './wind-regl';
import tidalValues from './tidal-values';
import costs from './costs';
import surge from './surge-regl';
import intro from './intro';
import titles from './titles';
import scrollama from 'scrollama';

let isMobile = window.innerWidth <= 650;

let scroller = scrollama();

window.onbeforeunload = function () {
  window.scrollTo(0, 0);
}

// import footer from './footer';

const $body = d3.select('body');
let previousWidth = 0;

function resize() {
  // only do resize on width changes, not height
  // (remove the conditional if you want to trigger on height change)
  const width = $body.node().offsetWidth;
  if (previousWidth !== width) {
    previousWidth = width;
    seaLevel.resize();
   // windLarge.resize();
    //stormTracks.resize();
    tidal.resize();
    costs.resize();
    surge.resize();
  }
}

function init() {
  // add mobile class to body tag
  // setup resize addEventListener
  window.addEventListener('resize', debounce(resize, 150));
  // setup sticky header menu
  // setupStickyHeader();
  // kick off graphic code
  seaLevel.init();
  //windLarge.init();
  //stormTracks.init();
  costs.init();

  if (!isMobile) {
    tidal.init();
    windMap.init();
    surge.init();
  }
  
  intro.init();
  titles.init();
  // load footer stories
  // footer.init();
}

init();
