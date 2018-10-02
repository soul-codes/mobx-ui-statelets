---
layout: default
---

# Getting Started Guide Part 1: First Application State

In this guide, we will write a very minimal application with
{{site.github.repository_name}} that does the following:

- show a text input
- lets you confirm an input on blur or on hitting enter
- shows the last confirmed value of your input.

{% include_relative _disclaimer.md %}

### Install the package

{{site.github.repository_name}} will be using `mobx` and `mobx-react` that you
should already have set up.

```
yarn add -D mobx-ui-statelets
```

### First application state

We will explore the first headless state class that's offered by
{{site.github.repository_name}}, namely `Input`. This represents a single
form input. For simplicity we will not actually create a form yet. The code
below creates a single `Input` state with the default value being an empty
string.

So go ahead and create `AppState.ts` as follows:

```tsx
// AppState.ts
{% include_relative demo-code/input-1-intro/AppState.ts %}
```

What we're creating here is just an arbitrary state class that has an `Input`
state as one of it's properties. `Input` not only acts as state store for our
input state, but it also has a few action methods that our React components
can use directly. We will let a React component talk to it in the next step.

### App component

We will create `App.tsx` that exports our application component. This will accept
an instance of our `AppState`, extracts our `Input` state from it and wire it to
an `<input />` element.

```tsx
// App.tsx
{% include_relative demo-code/input-1-intro/App.tsx %}
```

Let's look at a few details here:

- The `Input` class has the property `inputValue` that updates whenever you
  call the `input()` method. By hooking this property to the `value` props and
  updating it through `onChange` event, this essentially makes our `<input />`
  a [controlled component](https://reactjs.org/docs/forms.html#controlled-components).
- As per the requirement we set for this guide, we want the user's input value
  to be confirmed on blur and on hitting enter. So we hook to `onBlur` and
  `onKeyPress` to do this accordingly. `Input`'s `confirm()` method tells the
  class to store the input value into its own internal store.
- For debugging, we show the last saved input value. This demonstrates that
  `Input` acts in kind as a domain store.

### Putting everything together

With the application's state and the application component itself, we can put
them together via ReactDOM's `render` method. We're also going to export the
application state as a global for ease of inspection.

```tsx
// index.tsx
{% include_relative demo-code/input-1-intro/index.tsx %}
```

You can inspect the `appState` global that we exported in the iframe's context through
[the console](https://allthingscraig.com/blog/2013/03/13/chrome-console-and-iframes/).

<iframe 
    id="{{site.github.repository_name}} demo"
    src="../demo/input-1-intro/index.html" width="100%">
</iframe>

### What next?

At this point, we don't yet see any real benefit of headless state management
over in-component state management. In the [next](./getting-started-2.md), we will
begin to get glimpses of this as we try to control focus state of a component
without from the headless state perspective.
