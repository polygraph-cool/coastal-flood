import 'intersection-observer';
import scrollama from 'scrollama';

const scroller = scrollama();

// setup the instance, pass callback functions
scroller
  .setup({
    step: '.intro__step'
  })
  .onStepEnter(({ element, index, direction }) => {
    let $text = element.querySelector('.intro__step__text');
    $text.classList.remove('read');
    $text.classList.add('reading');
  })
  .onStepExit(({ element, index, direction }) => {
    let $text = element.querySelector('.intro__step__text');
    $text.classList.remove('reading');

    if (direction === 'down') {
      $text.classList.add('read');
    }
  });

// setup resize event
window.addEventListener('resize', scroller.resize);