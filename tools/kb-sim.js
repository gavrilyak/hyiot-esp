const mqtt = require("mqtt");
const client = mqtt.connect("mqtt://localhost:1883");

const stdin = process.stdin;
// without this, we would only get streams once enter is pressed
stdin.setRawMode(true);

// resume stdin in the parent process (node app won't quit all by itself
// unless an error or process.exit() happens)
stdin.resume();

// i don't want binary, do you?
stdin.setEncoding("utf8");

// on any data into stdin
stdin.on("data", function (key) {
  // ctrl-c SIGINT, ctrl-d  EOF
  if (key === "\u0003" || key === "\u0004") {
    process.exit();
  }
  // write the key to stdout all normal like
  console.log(JSON.stringify(key));
  client.publish("device1/kb", key);
});
