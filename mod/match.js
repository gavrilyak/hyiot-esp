export default function match(filterArray, topic) {
  const topicArray = topic.split("/");
  const length = filterArray.length;
  for (let i = 0; i < length; ++i) {
    const left = filterArray[i];
    const right = topicArray[i];
    if (left === "#") return topicArray.length >= length - 1;
    if (left !== "+" && left !== right) return false;
  }

  return length === topicArray.length;
}
