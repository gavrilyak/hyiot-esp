export default function tryJSON(maybeJSON) {
  if (typeof maybeJSON === "string") {
    try {
      return JSON.parse(maybeJSON);
    } catch (e) {
      return maybeJSON;
    }
  }
  return maybeJSON;
}
