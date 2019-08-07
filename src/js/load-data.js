/* global d3 */
/* usage
	import loadData from './load-data'
	loadData().then(result => {

	}).catch(console.error)
*/

function loadA(file) {
  return new Promise((resolve, reject) => {
    d3[file.endsWith('json') ? 'json' : 'csv'](`assets/data/${file}`)
      .then(result => {
        // clean here
        resolve(result);
      })
      .catch(reject);
  });
}

export default function loadData(files) {
  const loads = files.map(loadA);
  return Promise.all(loads);
}
