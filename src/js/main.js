/* global d3 */
import debounce from 'lodash.debounce';
import isMobile from './utils/is-mobile';
import seaLevel from './sea-level';
import windSmallMultiples from './winds-sm';
import windLarge from './wind-large';
import stormTracks from './storm-tracks';
import tidal from './tidal-regl';
import tidalValues from './tidal-values';
import './intro';

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
    windSmallMultiples.resize();
    windLarge.resize();
    //stormTracks.resize();
    tidal.resize();
    tidalValues.resize();
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
  windSmallMultiples.init();
  windLarge.init();
  //stormTracks.init();
  tidal.init();
  tidalValues.init();
  // load footer stories
  // footer.init();
}

init();
