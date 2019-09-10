const fs = require("fs");
const path = require("path");
const jsdom = require("jsdom").JSDOM;

// Grab NODE_ENV and REACT_APP_* environment variables and prepare them to be
// injected into the application via DefinePlugin in Webpack configuration.
const REACT_APP = /^REACT_APP_/i;
const NODE_ENV = process.env.NODE_ENV || "development";
const isDev = NODE_ENV === "development" ? true : false;
const publicPath = path.resolve(
  __dirname,
  NODE_ENV === "production" ? "./build" : "./public"
);

if (isDev) {
  require("dotenv").config({
    path: path.join(__dirname, ".", ".env.local")
  });
}

/*===============Create env.js and add each ENV variables as window.ENV variables ==========================================*/

function getClientEnvironment(publicUrl) {
  const raw = Object.keys(process.env)
    .filter(key => REACT_APP.test(key))
    .reduce(
      (env, key) => {
        env[key] = process.env[key];
        return env;
      },
      {
        // Useful for determining whether we’re running in production mode.
        // Most importantly, it switches React into the correct mode.
        NODE_ENV: process.env.NODE_ENV || "development",
        // Useful for resolving the correct path to static assets in `public`.
        // For example, <img src={process.env.PUBLIC_URL + '/img/logo.png'} />.
        // This should only be used as an escape hatch. Normally you would put
        // images into the `src` and `import` them in code to get their paths.
        PUBLIC_URL: publicUrl
      }
    );
  // Stringify all values so we can feed into Webpack DefinePlugin
  const stringified = {
    "process.env": Object.keys(raw).reduce((env, key) => {
      env[key] = JSON.stringify(raw[key]);
      return env;
    }, {})
  };

  return { raw, stringified };
}

let publicUrl = process.env.PUBLIC_URL;
const variables = getClientEnvironment(publicUrl).stringified;
const { PUBLIC_URL } = variables["process.env"];
if (PUBLIC_URL === undefined) {
  variables["process.env"]["PUBLIC_URL"] = "/";
}
const allEnv = JSON.stringify(variables["process.env"]).replace(/\\"/g, "");
const tpl = `
  window.ENV = ${allEnv};
`;

const envPath = path.resolve(publicPath, "env.js");
fs.writeFileSync(envPath, tpl);
console.log(`env variables was successfully copied to ${envPath}!`);

/*======================= Create the base element according to public URL   ===================================*/

console.log(`Creating base element!`);
let BASE_ELEMENT = "";
const baseValue = PUBLIC_URL ? PUBLIC_URL.replace(/"/g, "") : null;
// Is baseValue true or false ?
// console.log(Boolean(baseValue));

if (baseValue) {
  const completedBaseValue = baseValue.endsWith("/")
    ? baseValue
    : baseValue + "/";
  BASE_ELEMENT = completedBaseValue;
  console.log(`Base Element was set to ${baseValue}!`);
}

/*======================= Add the base element to the dom  ===================================*/

const indexPath = path.resolve(publicPath, "index.html");

const options = {
  runScripts: "dangerously",
  resources: "usable"
};

jsdom
  .fromFile(indexPath, options)
  .then(dom => {
    function addToDom() {
      const base = document.createElement("base");
      base.href = `${BASE_ELEMENT}`;
      const head = document.querySelector("head");
      head.appendChild(base);

      const pageContent = document.documentElement.outerHTML;
      fs.writeFileSync(indexPath, pageContent, err => {
        console.log(err);
      });
    }

    function removeFromDom() {
      const head = document.querySelector("head");
      head.removeChild(head.querySelector("base"));
    }

    const window = dom.window,
      document = window.document;
    if (document.querySelector("base")) {
      removeFromDom();
      addToDom();
    } else {
      addToDom();
    }
  })
  .catch(err => {
    console.log(err);
  });

if (!fs.existsSync(indexPath)) {
  console.log(`The file index.html can't be found!`);
  process.exit(1);
}

console.log(`Done setting base Element`);
