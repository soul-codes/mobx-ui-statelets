---
layout: default
---

# Getting Started Guide Part 2: Manipulating DOM State Agnostically

in this guide, we will explore a key benefit of headless state management:
controlling physical DOM state without knowing about the components that present
them.

In [the previous guide](./getting-started-1.md), we built a minimal application
with a single text input. in this guide, we will first do a quick detour of how
to control focus state on a DOM element with fewer states: a button. We will then
come back to the text input and add the following functionality:

- The input is automatically focused when the application loads.
- Hitting escape while the input is focused reverts unsaved changes and blurs
  out of the input.
- Clicking on a button focuses on the input.

### Controlled focus with `FocusState`

Before we dive back into our input application, let's consider how our headless
state can be informed of _and_ manipulate focus state while not knowing anything
about the components.

To do this, we'll create an App state that contains a single `FocusState`, another
handy state class offered by {{site.github.repository_name}}.

```tsx
// AppState.ts
{% include_relative demo-code/focus-1/AppState.ts %}
```

As a headless state, `FocusState` doesn't know anything about the DOM elements
that will get focused. Without a React component talking to it, its state has
no practical consequence. So what we'll do is creating a component that talks
to a `FocusState`. We'll use a `<button />` element as the subject of our
experiment.

```tsx
// Button.tsx
{% include_relative demo-code/focus-1/Button.tsx %}
```

Let's break this down:

- The `Button` component wraps a `<button />` DOM element, whose `ref` we capture
  in a class property.
- We listen to the button's `onFocus` and `onBlur` and report such happenings to
  our `FocusState` via [`reportFocus`](../api/classes/focusstate.html#reportfocus)
  and [`reportBlur`](../api/classes/focusstate.html#reportfocus) respectively. This
  makes sure that any user-driven change in focus state gets communicated to our
  headless state.
- We use the [`syncFocusState`](../api/index.html#syncfocusstate) decorator
  to select the DOM element whose focus state should be synced if the headless
  state changes. This makes sure that a programmatic call to focus from the
  headless state side is projected to a real presentational consequence.

Essentially, what **we are doing here is the same as React's
[controlled component pattern](https://reactjs.org/docs/forms.html#controlled-components)
for input value applied to focus state**. Look at the parallel:

| pattern           | how DOM reports back                                | how DOM is controlled                   |
| ----------------- | --------------------------------------------------- | --------------------------------------- |
| controlled inputs | `onChange` event sets state                         | `value` prop receives input value state |
| controlled focus  | `onFocus`/`onBlur` calls `reportFocus`/`reportBlur` | `syncFocusState` decorator              |

Let's now try to see how we can accurately read and manipulate the button focus
state from the headless state. For visual clarity, we'll style a focused button
so that it looks blatantly different from an unfocused one.

```tsx
// App.tsx
{% include_relative demo-code/focus-1/App.tsx %}
```

<iframe 
    id="{{site.github.repository_name}} focus-controlled button demo"
    src="../demo/focus-1/index.html" width="100%"></iframe>

Remarkably, once the `Button` component wires up the nececssary linkage,
the readout and manipulation of focus state simply with the headless state API.
The beauty here is that the `Button` component doesn't need to know who's controlling
it's focus, and the headless state doesn't need to know where that focus state
is exactly presented. In fact, we actually have _two_ presentations: one as the
DOM state itself, and we are showing whether the button is focused or not.
This uncoupling of application state from the React component hierarchy lets us
use any state wherever, and is the foundational idea of headless state management.

### Focus-controlling the input element.

Now that we figured out how to headlessly control focus state on a button, we will
pick up from where we left off in the [previous guide](./getting-started-1.md) and
do the same for our text input element.

Let's revisit our application state:

```tsx
// App.tsx
{% include_relative demo-code/input-2-focus/AppState.ts %}
```

Our `InputState` actually already contains an instance of `FocusState` in the
[`focusState`](../api/classes/input.html#focusstate) property, so we won't
be anything here.
{{site.github.repository_name}} bakes this in on the assumption that an input
state usually will be presented in some DOM element that can receive focus.

However, it's totally up to you to give meaning to this focus state: We will do
this now by creating a focus-controlled input from our input state.

For clarity of illustration we'll create an isolated `TextInput` component that
has the requirements we set out earlier: hitting escape while focused cancels
pending input and blurs it. Now we have an input that is both value-controlled
and focus-controlled.

```tsx
// TextInput.tsx
{% include_relative demo-code/input-2-focus/TextInput.tsx %}
```

Now we'll switch out the ad-hoc input in our App component with the `TextInput`
component we just created. We'll also add a button that will focus on the
input programmatically as per our requirement:

```tsx
// App.tsx
{% include_relative demo-code/input-2-focus/App.tsx %}
```

Our last requirement is that when the application loads up, we assign focus to
the input right away. We can do this using our headless state.

```tsx
// index.tsx
{% include_relative demo-code/input-2-focus/index.tsx %}
```

Now we behold the result. Once the demo loads, the input should be focused
right away.

<div>
  <button id="load-demo">Click to load demo</button>
  <iframe 
    id="{{site.github.repository_name}} focus-controlled input demo"
    width="100%"
    style="display:none">
  </iframe>
  <script>
    document.getElementById('load-demo').addEventListener('click', function(ev)
    {
      var iframeId = "{{site.github.repository_name}} focus-controlled input demo";
      var iframeElement = document.getElementById(iframeId);
      iframeElement.src="../demo/input-2-focus/index.html";
      iframeElement.style.display = "block";
      ev.target.style.display = "none";
    });
  </script>
</div>

### Comparison with in-component state management

Let's imagine how we would have implemented the examples above without headless
state management, that is, keeping all the state within the component hierarchy.

Take the `Button` focus example, in terms of tracking the focus state, we would
let `Button` component expose `onFocus`/`onBlur` hooks that the `App` component
could handle by setting its own component state to track the focus state.
Something like this:

```tsx
// Somewhere in App.tsx
<Button
  onFocus={ () => this.setState( { isButtonFocused : true } )}
  onBlur={ () => this.setState( { isButtonFocused : false } )}
  />
/* ... */
<p>{ this.state.isButtonFocused ? 'focused' : 'blurred' }</p>
```

This is essentially the [state lifting pattern](https://reactjs.org/docs/lifting-state-up.html).

As for programmatically focusing the button, the `Button` component would pass
the ref (either manually, or using [ref forwarding](https://reactjs.org/docs/forwarding-refs.html);
the example below forwards ref manually):

```tsx
// Somewhere in App.tsx
<Button
  buttonRef = { el => this.buttonEl } />

/* ... */
<button onClick = { () => this.buttonEl && this.buttonEl.focus() } />
```

Now considering the text input autofocus example, we would probably use something
like `componentDidMount` hook:

```tsx
componentDidMount();
{
  this.buttonEl && this.buttonEl.focus();
}
```

All this might a take little more technical footprint, but it works fine. Everything
lives inside the component hierarchy so you don't need have two layers of
information. And we have good encapsulation: state is accessible strictly to
only the components that consume it So what is there to complain about?

Answer: **it's fine _as long as your requirements are locked down._**

As soon as you realize that the `Button` needs to live somewhere _else_ in the
React component hierarchy, you will need to re-wire the state lifting/ref forwarding
to that new destination. Each level that you need to do this incurs a couple of
prop changes along the way.

If the source of the focus state and its consumer are three generations apart,
you do the lifting/forwarding three times. Or you exploit
[context](https://reactjs.org/docs/context.html) to shortcut things.

Because state lifting, ref forwarding and context leave technical footprint -- dilulting the
fraction of your code that actually expresses your application logic -- you would
want to use the pattern as much as you absolutely need. Depending on the need
to keep a project clean, you would optimize your code more often to reduce the
technical footprint. But this in itself is a potentially substantial refactor each time.

All is this is for _one_ focus state.

If you want really streamlined UX, maintaining fifty in a medium sized application
isn't hard to imagine. Things also get messier if you want to reuse `Button` in
such a way that some has shared states and others don't.

With headless state management, you pre-emptively accept that _any_ state that
can be _reasonably expected_ to be consumed by _anybody_ on the React component
hierarchy will just be taken out of the component hierarchy. This way,
your code is much, much more resilient to requirement changes.

React components become _really simple_: their jobs are simply:

- Present the headless state
- Translate user actions to mutations on the headless state.
- Report DOM state changes to the headless state.
- Reflect headless state changes to the DOM state.

They do not contain state logic, except for some microstate that has absolutely
no good reason to be consumed elsewhere. So if it's the application logic that
changes, to a very large extent you will not touch the React components.

### No magic here

It's also worth emphasizing here that there's nothing magical about
`FocusState`. {{site.github.repository_name}} provides it for convenience, but
if you explore the [code]({{site.github.repository_url}}/blob/master/src/state/Focus.ts)
you will see that it is nothing but a few getters and setters. Likewise
the [code]({{site.github.repository_url}}/blob/master/src/sync/syncFocusState.ts)
for `syncFocusState` is a simple bootstrapping of the DOM state powered by
[a reusable decorator]({{site.github.repository_url}}/blob/master/src/sync/syncDOMState.ts).

You could just as well create your own headless state class.

The real work agent is a different way of separating concerns that lets you have
access to the application's granular state from one place.

### What next?

The ability to control focus programmatically is a big plus if we want to refine
form behavior. If you're interested in this, you can head over to the
"[forms with {{site.github.repository_name}}](./form-1.md)" series.

Otherwise we will
proceed to exploring another benefit of headless statement that we touched on
briefly: the ability for us to use any state anywhere. [Let's go](./getting-started-3.md)!
