import React from "react";
import ReactDOM from "react-dom";
import { Input, Validator, Form, Actuator } from "../src";

import TextInput from "./dev/TextInput";
import ValidationLabel from "./dev/ValidationLabel";
import Button from "./dev/Button";

const required = (value: string) => !value && { error: "required" };
const trim = (value: string) => value.trim();

const street = new Input<string>("", { normalizer: trim, name: "street" });
const validateStreet = new Validator(street, {
  format: required,
  domain: async street => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return !street.startsWith("Wich") && { error: "street domain" };
  }
});

const houseNo = new Input<string>("", {
  normalizer: trim,
  name: "house number"
});
const validateHouseNo = new Validator(houseNo, { format: required });

const postCode = new Input<string>("", { normalizer: trim, name: "post code" });
const validatePostCode = new Validator(postCode, { format: required });

const city = new Input<string>("", { normalizer: trim, name: "city " });
const validateCity = new Validator(city, { format: required });

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
    enabled: () =>
      validateStreet.isConclusivelyValid &&
      validateHouseNo.isConclusivelyValid &&
      validatePostCode.isConclusivelyValid &&
      validateCity.isConclusivelyValid
  }
);

const form = new Form(
  () => validateAddress,
  async value => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert(JSON.stringify(value, null, 2));
    return { success: true as true };
  }
);

const reset = new Actuator(() =>
  form.reset({
    value: {
      street: "",
      houseNo: "",
      postCode: "",
      city: ""
    }
  })
);

ReactDOM.render(
  <div>
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
      <Button actuator={form} />
    </div>
    <div>
      <Button actuator={reset} />
    </div>
  </div>,
  document.getElementById("react-root")
);
