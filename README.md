**:warning: This package is still in 0.x.y stage, so do expect incomplete documentation and API changes.**

`mobx-ui-statelets` is a set of [MobX](https://github.com/mobxjs/mobx)-decorated classes for managing commonly
needed UI states. It currently has a large emphasis on form state entities, but
the plan is to extend it to other common state entities too.

## What's on offer?

Currently the package offers the following basic state classes:

- `Task` stores progress state of any asynchronous task (think placing orders,
  logging in, fetching data).
- `Input` stores form input values and a simple mechanics for querying choices,
  (think text inputs, dropdowns with autocompletes).
- `Validator` stores asynchronous validation state that can be linked to one or
  several inputs.
