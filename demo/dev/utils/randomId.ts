export default function randomId() {
  return "input" + (Math.random() * 1e8).toString(16);
}
