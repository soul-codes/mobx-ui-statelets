# mobx-ui-statelets: state classes for headless state management.

`mobx-ui-statelets` is a set of [MobX]()-decorated classes for managing commonly
needed UI states. It currently has a large emphasis on form state entities, but
the plan is to extend it to other common state entities too.

**:warning: This package is still in 0.x.y stage, so do expect incomplete documentation and API changes.**

## What's on offer?

Currently the package offers the following basic state classes:

- `Task` stores progress state of any asynchronous task (think placing orders,
  logging in, fetching data).
- `Input` stores form input values and a simple mechanics for querying choices,
  (think text inputs, dropdowns with autocompletes).
- `Validator` stores asynchronous validation state that can be linked to one or
  several inputs.

## How do I use it?

### 1. Install the package and its peer dependencies

```
yarn add -D mobx-ui-statelets
yarn add -D react react-dom mobx mobx-react
```

### 2. Create your state class

```ts
// State.tsx
import { Input } from "mobx-ui-statelets";
export class MyGreeterState {
  nameInput = new Input("" as string);
}
```

### 3. Create the presentation layer

```tsx
// Component.tsx
import React, { Component } from "react";
import { observer } from "mobx-react";
import { MyGreeterState } from "./State";

@observer
export class MyGreeter extends Component<{
  state: MyGreeterState;
}> {
  render() {
    const { state } = this.props;
    return (
      <input
        type="text"
        value={state.nameInput.inputValue}
        onChange={ev => state.nameInput.input({ value: ev.target.value })}
        onBlur={ev => state.nameInput.confirm({ value: ev.target.value })}
      />
    );
  }
}
```

### 4. Link it all up!

```tsx
import React from "react";
import { render } from "react-dom";
import { MyGreeterState } from "./State";
import { MyGreeter } from "./Component";

render(
  <MyGreeter state={new MyGreeterState()} />,
  document.getElementById("your-react-root")
);
```

### 5. Continue the journey on our [tutorial pages]() `@todo link`.

## What headless state?

The idea here is to manage most of the application state and microstate --
both domain and UI -- without mounting React components.

If you create a React application without any state management like MobX or
Redux, you could tie your UI state to React components by using the component's
own `state`. However, this requires that the state's consumption and persistence
is the same with the component that hosts it. If state information is
shared between components or needs to persist beyond the component
lifecycle, React recommends [lifting the state up](https://reactjs.org/docs/lifting-state-up.html)
to restore that parity.

The premise of headless state management is that you lift virtually all state
information -- except those you are absolutely certain to never leave the component --
out of the React component hierarchy altogether. You would then reason about the
application mostly through this isolated state hierarchy.

## Why headless state?

### Code resilience

While the state lifting pattern works, it exposes your codebase to a pretty hefty
internal API change each time your state consumption landscape changes. This makes
it difficult for your codebase to embrace requirement changes, which are
nowadays the expected nature of continuous delivery.

A headless state hierarchy, on the other hand, is uncoupled from the React component.
So any change happening on the presentational side does not affect the state hierarchy,
and changes in the state hierarchy consumption changes at best the passing of a
single state object down the React component hierarchy.

### Logical clarity

It also means that in order to reason about -- and indeed test -- the UI state,
you'll need to mount React components, dig through the component hierarchy, create
mocks, stubs, spies of components or props you are interested in and somehow
_infer_ your application state from such assertions. This is demonstrated in the
Jest/enzyme pseudocode below.

```tsx
test("submitting increment a counter after a disabled state", async () => {
  const fixture = mount(<MyFeature />);
  expect(fixture.find(Counter).prop("children")).toBe(0);
  fixture.find(SubmitButton).click();

  expect(fixture.find(SubmitButton).prop("disabled")).toBe(true);
  await waitUntil(() => fixture.find(SubmitButton.prop("disabled") === false));

  expect(fixture.find(Counter).prop("children")).toBe(1);
});
```

An application with headless state can be tested with more clarity, precision and
expressivity, while suffering less technical overhead. You simply instantiate the
state class of choice and invoke the actions that are usually delegated to the
human users via the React components. All assertions can be done separately from
the React component hierarchy.

```tsx
test("submitting increments a counter after the pending state", async () => {
  const state = new MyFeatureState();
  expect(state.counter).toBe(0);

  state.submit();
  expect(state.myTask.isPending).toBe(true);

  await state.myTask.promise;
  expect(state.myTask.isPending).toBe(false);
  expect(state.counter).toBe(1);
});
```

Maintaining a headless state hierarchy not only makes state test code to the point,
it also makes the React components almost always dumb. The "smartest" of React
components themselves are the connectors between the headless state and the
truly dumb stateless component. Such connections can now be tested in a unit
manner, isolated from how the state actually transitions.

```tsx
test("Button is in disabled state if task is in pending state", () => {
  const state = new MyFeatureState();
  const fixture = mount(<MyFeature state={state} />);
  expect(fixture.find(SubmitButton).prop("disabled")).toBe(false);

  state.submit();
  expect(fixture.find(SubmitButton).prop("disabled")).toBe(true);
});

test("Counter reflects the state counter value", async () => {
  const state = new MyFeatureState();
  const fixture = mount(<MyFeature state={state} />);
  expect(fixture.find(Counter).prop("children")).toBe(0);

  await state.submit();
  expect(fixture.find(Counter).prop("children")).toBe(1);
});
```

## I could create headless state myself

Of course you can!

If you do, one important component of maintaining headless state to bear in mind
is to make sure that any final source of truth for state that usually lives in
the DOM (like hover, focus, input and selection state) needs to be delegated
(or at least kept in sync) in our headless state.

In fact, React's
[controlled component](https://reactjs.org/docs/forms.html#controlled-components)
pattern does exactly this with the input element state; the only difference is that
the delegation is between the DOM element an a React component.

This package extends on the idea and provides methods on the state classes that
your React components can hook to to keep the other DOM state in sync. Then you
would be able to reason about these DOM state without mounting any DOM element!

You can use this package for inspiration on what to build if you have custom
state management needs.
