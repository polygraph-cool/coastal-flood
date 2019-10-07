/* global d3 */
import debounce from 'lodash.debounce';
import isMobile from './utils/is-mobile';
import seaLevel from './sea-level';
import tidal from './tidal-regl';
import windMap from './wind-regl';
import tidalValues from './tidal-values';
import costs from './costs';
import surge from './surge-regl';
import intro from './intro';
import titles from './titles';
import scrollama from 'scrollama';

let scroller = scrollama();

if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

window.scrollTo(0, 0)

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
  $body.classed('is-mobile', isMobile.any());
  // setup resize addEventListener
  window.addEventListener('resize', debounce(resize, 150));
  // setup sticky header menu
  // setupStickyHeader();
  // kick off graphic code
  seaLevel.init();
  //windLarge.init();
  //stormTracks.init();
  costs.init();
  tidal.init();
  windMap.init();
  surge.init();
  intro.init();
  titles.init();
  // load footer stories
  // footer.init();
}

init();
