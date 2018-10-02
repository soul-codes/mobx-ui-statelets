import React, { Component } from "react";
import ReactDOM from "react-dom";
import {
  Input,
  Validator,
  Form,
  Task,
  DataQuery,
  FetchQuery,
  ValidatedInput
} from "../src";

import TextInput from "./dev/TextInput";
import ValidationLabel from "./dev/ValidationLabel";
import Button from "./dev/Button";
import { observer } from "mobx-react";
import DevComboBox from "./dev/ComboBox";

const required = (value: string) => !value && { error: "required" };
const trim = (value: string) => value.trim();

const street = new Input("" as string, {
  normalizer: trim,
  name: "street"
});
const validateStreet = new Validator(street, {
  parse: required,
  validateOnInput: true,
  domain: async (street, helpers) => {
    console.log(`validate "${street}"`);
    helpers.onCancel(() => console.log(`canceled "${street}"`));
    await new Promise(resolve => setTimeout(resolve, 1000));
    return !street.startsWith("Wich") && { error: "street domain" };
  }
});

const houseNo = new Input<string>("", {
  normalizer: trim,
  name: "house number"
});
const validateHouseNo = new Validator(houseNo, { parse: required });

const postCode = new Input<string>("", { normalizer: trim, name: "post code" });
const validatePostCode = new Validator(postCode, { parse: required });

const city = new Input<string>("", { normalizer: trim, name: "city " });
const validateCity = new Validator(city, { parse: required });

const validateAddress = new Validator(
  () => ({ street, houseNo, postCode, city }),
  {
    domain: async value => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return value.street === "Wichertstrasse"
        ? {
            error: "address",
            correction: {
              ...value,
              street: "Wichertstr."
            }
          }
        : value.street === "Wichertstr."
          ? null
          : { error: "address" };
    },
    enabled: validator =>
      validator.nestedValidators.every(
        validator => validator.isConclusivelyValid
      )
  }
);

import Axios, { default as axios } from "axios";
const githubRepo = new ValidatedInput(null as number | null, {
  parse: value => value === null && { error: "required" }
});
const fetchGithubRepos = new DataQuery({
  fetch: async (query: FetchQuery<string>, helpers) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    if (helpers.isCanceled) return false;

    try {
      if (!query.query) {
        return {
          items: [] as { id: number; name: string }[],
          isDone: true
        };
      }

      const result = (await axios.get(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(
          query.query
        )}&page=${1 + query.offset / 10}&per_page=10`,
        {
          cancelToken: new Axios.CancelToken(helpers.onCancel)
        }
      )) as {
        data: { items: { id: number; name: string }[]; total_count: number };
      };
      return {
        items: result.data.items,
        total: result.data.total_count
      };
    } catch (ex) {
      return false;
    }
  }
});

const form = new Form(
  { githubRepo, ...validateAddress.inputs },
  {
    initialProgress: 0,
    action: async (value, helpers) => {
      let x = 0;
      await new Promise(resolve => {
        const interval = setInterval(() => {
          x++;
          helpers.reportProgress(x);
          if (x === 50) resolve();
        }, 100);
        helpers.onCancel(() => clearInterval(interval));
      });
      alert(JSON.stringify(value, null, 2));
      return 2;
    }
  }
);

const reset = new Task(() =>
  form.reset({
    value: {
      street: "",
      houseNo: "",
      postCode: "",
      city: "",
      githubRepo: null
    }
  })
);

street.focusState.focus();

@observer
class Demo extends Component {
  render() {
    return (
      <div>
        <div>
          <DevComboBox
            input={githubRepo}
            format={value => {
              const item = fetchGithubRepos.items.find(
                item => item.id === value
              );
              return item ? item.name : "(search)";
            }}
            dataQuery={fetchGithubRepos}
            options={fetchGithubRepos.items.map(item => ({
              id: item.id,
              value: item.id,
              label: item.name
            }))}
          />
        </div>
        <div>
          <TextInput input={street} />
          <ValidationLabel validator={validateStreet} />
          <ValidationLabel validator={validateAddress} />
        </div>
        <div>
          <TextInput input={houseNo} />
          <ValidationLabel validator={validateHouseNo} />
        </div>
        <div>
          <TextInput input={postCode} />
          <ValidationLabel validator={validatePostCode} />
        </div>
        <div>
          <TextInput input={city} />
          <ValidationLabel validator={validateCity} />
        </div>
        <div>
          <Button Task={form} />
          {form.submitActionProgress}
        </div>
        <div>
          <Button Task={reset} />
        </div>
      </div>
    );
  }
}

ReactDOM.render(<Demo />, document.getElementById("react-root"));

Object.assign(window, {
  state: {
    street,
    fetchGithubRepos
  }
});
