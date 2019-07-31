function sumArray(arr, elFn = x => x) {
  return arr.reduce((sum, x) => sum + elFn(x), 0);
}

export {
  sumArray,
}