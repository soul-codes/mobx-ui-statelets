---
layout: default
---

# Getting Started Guide Part 4: Testing

In [part 2](./getting-started-2.md) and [part 3](./getting-started-3.md),
we learnt how keeping the state hierarchy separated from React components made
state headlessly while ensuring real DOM consequence.

In this part we will take the flight booking form in part 3 as an example as to
how we would proceed to test an application with headless state.

In the examples below, we'll be using [Jest](https://jestjs.io/) for the test
runner and assertion, and [Enzyme](https://github.com/airbnb/enzyme) for mounting
and inspecting React components. How to set these up are beyond the scope of this guide.
The ideas should be easily adopted using other tools.

### Possible kinds of test

There are a few things that we can test when using headless state management:

- Testing the headless state in isolation
- Testing a component's interaction with generic headless state (in abstract context).
- Testing a component receiving the right state (in application/feature context).

Let's look at this one in turn.

### Testing the headless state in isolation

With headless state, our `AppState` now carries the bulk of the logic that we
can test without mounting any React component.

In the last part's demo, we had a requirement that the hover and focus state of
the inputs dictate the "active" input, which will be used in the presentataion
to show different messages. On the state side, we simply test that the computation
of the active input is correct based on the hover and focus states. We assume at
this stage that the "report" methods represent the points of user interaction.

```tsx
{% include_relative demo-code/input-3-hover/__tests__/state.test.ts %}
```

With full access to the entire application's state and its actions, we can
"integration"-test complex user scenario spanning what would be presented in different
parts of the React component hierarchy. The test can be much more comprehensive that
the small sample given above.

We assume the state action API to represent the user's "entry point" of interactions.
which we can validate when we unit-test the components. We will explore this next.

### Testing a component's interaction with the headless state.

Here we test that, given a state, the component is behaving in the expected way.
We also test the converse: a user interaction will cause the expected state
mutation.

The example below tests how the `TextInput` component generically interacts with
the `Input` state given to it when considering its nestd focus state.

```tsx
{% include_relative demo-code/input-3-hover/__tests__/TextInput.focus.test.tsx %}
```

When we were testing the headless state in isolation, we assumed that the "report"
methods represent the user actions. In the tests directly above, we could alternatively
spy on the "report" methods to see that they are called in response to our simulation
of user events (`"focus"` and `"blur"`). What we have here instead is assertion
over the immediate consequence of those report methods (e.g. asserting
`isFocused`), that reasonably imply that the report methods were used as a consequence
to the user events.

Similar tests could be written for hover state reporting.

Another requirement we had was the presentation of the correct message depending
on the active input. We can test how our `App` component handles this:

```tsx
{% include_relative demo-code/input-3-hover/__tests__/App.message.test.tsx %}
```

(Note: in reality you probably wouldn't be hard-coding these string constants.)

Since we would already test the headless state quite comprehensively, here it
should suffice to use whatever easiest way to put the application state into the
required state for presentation.

These tests are generally "unit" and are confined to single components.
They work especially well if your application has reusable components that present
reusable headless state like this `TextInput`.

### Testing a component receiving the right state.

So far we have tested the integrity of the application state at a holistic level,
and we have unit-tested the components in their ability to generically interact
with state in abstract. What is left is the application context that bridges them
together: testing that in the full-mounted feature or application context, the
right reusable components are receiving the right state instance.

```tsx
{% include_relative demo-code/input-3-hover/__tests__/App.test.tsx %}
```

_A technical note on Enzyme here: we use reference quality `===` over the
[`filter` with property selector](https://airbnb.io/enzyme/docs/api/ReactWrapper/find.html)
syntax because the latter will only compare own properties. Since
{{site.github.repository_name}}'s state class properties are almost always
prototypal, all state class instances will likely be seen as equal by own
property values._

### Comparison with in-component state management

If we had kept our state inside the component, we would arguably write fewer
tests to cover the same logic, since we don't have a separate state hierarchy to
deal with. However, in order to test the application logic holistically, we
would need to mount and traverse the component hierarchy more often. For
instance, something like this:

```tsx
test("hover on name input changes active input", () => {
  const wrapper = mount(<App />);
  wrapper
    .find(/* condition for name input */)
    .find("input")
    .simulate("focus");
  expect(wrapper.state().activeInput).toBe("name");
});
```

```tsx
test("setting the active input changes the text", () => {
  const wrapper = mount(<App />);
  wrapper.setState({ activeInput: "name" });
  expect(wrapper.find("#help").text()).toBe(/* expected text */);
});
```

Just like in-component state lifting, requirement changes that cause state to be
lifted to different places in the component hierarchy will also affect tests.
In case of Enzyme, state access is prohibited except for at the root component,
a restriction aimed at encouraging more unit tests. Depending on how state is
lifted, some tests may need to be completely re-written.

As for a headless state architecture, presentational requirement changes will
generally not affect headless state tests, even when the change includes significant
reshuffling of the React component hierarchy. Application logic changes will only
affect React component tests if the changes result in different components
receiving different state.

Headless UI state testing in isolation will usually be more "to the point" in the
way that testing domain state logic in isolation is. Both are free from finding
the correct entry of mutation as this task is delegated to other tests as we
have demonstrated above.

### What next?

This article concludes the Getting Started series. At this point, you are ready
to explore what other state classes {{site.github.repository_name}} has to offer.

[Back to the table of contents](./index.md)
