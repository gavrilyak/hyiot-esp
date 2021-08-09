import { h, Fragment, Component, render, useState } from "./preact.mjs";

const items = [
  { name: "one", value: 1 },
  { name: "two", value: 2 },
];
const user = { firstName: "Vasyl", lastName: "Havryliak" };

function Profile({ firstName, lastName }) {
  const profile = h(
    "div",
    null,
    h("img", { src: "avatar.png", className: "profile" }),
    h("h3", null, [firstName, lastName].join(" "))
  );
  return profile;
}

function Items({ items }) {
  const descriptions = items.map((item) =>
    h(Fragment, null, h("dt", null, item.name), h("dd", null, item.value))
  );
  return descriptions;
}

class Counter extends Component {
  state = {
    value: 0,
  };

  increment = () => {
    this.setState((prev) => ({ value: prev.value + 1 }));
  };

  render({ label = "Counter" }, { value }) {
    return h(
      "div",
      {},
      `${label}: ${value}`,
      h("button", { onClick: this.increment }, "Increment")
    );
  }
}

function CounterHooks({ label }) {
  let [value, setValue] = useState(0);

  const onClick = () => setValue((x) => x + 1);

  return h(
    "div",
    {},
    `${label}: ${value}`,
    h("button", { onClick }, "Increment")
  );
}

function ConfigureWifi() {
  let [ssid, setSsid] = useState("");
  let [password, setPassword] = useState("");

  const onSubmit = async (evt) => {
    evt.preventDefault();
    const res = await fetch("/api/prefs/wifista", {
      method: "PUT",
      body: JSON.stringify({ ssid, password }),
    });
    if (!res.ok) {
      console.warn(res.status, await res.text());
      return;
    }
    const resp = await res.json();
    console.log(resp);
  };

  return h(
    "form",
    { onSubmit },
    h("label", { for: "ssid" }, "SSID"),
    h("input", {
      type: "text",
      id: "ssid",
      value: ssid,
      onChange: (e) => setSsid(e.target.value),
    }),
    h("br"),
    h("label", { for: "password" }, "Password"),
    h("input", {
      type: "text",
      id: "password",
      value: password,
      onChange: (e) => setPassword(e.target.value),
    }),
    h("br"),
    h("input", { type: "submit", value: "Save" })
  );
}

const app = h("h1", null, "Configure your wifi", h(ConfigureWifi));

render(app, document.body);
