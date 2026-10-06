function splitStringIntoParts(str, parts) {
  const length = Math.ceil(str.length / parts);
  const result = [];
  for (let i = 0; i < str.length; i += length) {
    result.push(str.slice(i, i + length));
  }
  return result;
}
module.exports = splitStringIntoParts;
