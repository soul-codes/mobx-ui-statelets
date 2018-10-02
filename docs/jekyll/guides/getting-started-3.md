---
layout: default
---

# Getting Started Guide Part 3: Computing over Headless State

In [the previous guide](./getting-started-2.md), we showed how to manipulate focus
state headlessly while ensuring real DOM consequence. We also showed how easy it
was to access a focus state because it was uncoupled from the React component
hierarchy.

In this guide we will fully exploit this uncoupled nature. We will build a simple
set of inputs, and a common place to show assisting text depending on which
input is hovered or focused.

### Reporting hover state

Just as we explored focus state manipulation in isolation in the previous part,
we will explore hover state reporting in isolation. {{site.github.repository_name}}
provides a simple [`HoverState`](../api/classes/hoverstate.html) class. An
important difference between hover state and focus state is that you cannot
_force_ the user to hover on something. So all we need to do is report back
accordingly.

A hover state is so easy to create, so let's create two:

```tsx
// AppState.ts
{% include_relative demo-code/hover-1/AppState.ts %}
```

And let our App component report to and read from them:

```tsx
// App.tsx
{% include_relative demo-code/hover-1/App.tsx %}
```

<iframe 
    id="{{site.github.repository_name}} hover state reporting demo"
    src="../demo/hover-1/index.html" width="100%" height="200px"></iframe>

So far so good, so let's proceed to building some text inputs that report
hover state!

### Adding hover state reporting to text inputs

We'll now build a pretend flight check-in form, where we show assisting
instruction when the user hovers or focuses on an input. For clarity of
illustration we won't wire any validation or submit action or even pretend these
inputs belong to a form yet.

First, let us upgrade our `TextInput` component so that it has a label to
distinguish between inputs. In addition, we'll also let the component report
hover state. Just as with focus state, the `Input` state class has its own
hover state that we use.

```tsx
// TextInput.tsx
{% include_relative demo-code/input-3-hover/TextInput.tsx %}
```

Now let us turn our attention to the application state, which now consists of
three inputs. What we'll also do is to create a getter that tells us which input
is currently "active". Let's make it so that the focused input has priority in
being considered active. If the user hovers, say, on the email but is focused
on the name, then the name input is considered active.

```tsx
// AppState.ts
{% include_relative demo-code/input-3-hover/AppState.ts %}
```

Finally, we wire everything up, and we use the `activeInput` as the discriminant
on which text to show:

```tsx
// App.tsx
{% include_relative demo-code/input-3-hover/App.tsx %}
```

<iframe 
    id="{{site.github.repository_name}} hover state reporting demo"
    src="../demo/input-3-hover/index.html" width="100%" height="200px"></iframe>

### Comparison with in-component state management

As with the [previous part's comparison](./getting-started-2.md#comparison-with-in-component-state-management), with
headless state we save ourselves from worrying about where the components that
report or consume our UI state live.

When it comes to computing over application state (like we did in finding out
what the "active" input is), if we keep all the state in the component hierarchy,
the computation will need to be lifted as high as the higest common ancestor
of all the components reporting that state change. Again, with headless state
management, we relieve ourselves from large component prop API changes just because
components contributing to a computed state move around.

### The meaning of state is what you give it.

> _"To invent your own life's meaning is not easy, but it's still allowed, and I think you'll be happier for the trouble."_ -- Bill Watterson

There is one important point here: notice that we hook to the mouse events on
the `div` that includes both the input and the label, and not the input itself.
It should again be emphasized that **the headless state has no meaning unless
you give it some**. If you take the `hoverState` of the input to mean the entire
input area, rather than the input itself, that's up to you. If you don't need
hover state tracking, then that state has no meaning. If you need several hover
states on a single input, you might want to consider deriving your own `Input`
class that has multiple `HoverState`s.

The freedom is yours. This package only encourages you to use the headless
pattern by providing reasonable defaults for the most common use cases.

### What next?

In this part we saw how easy it is to make computations over an application state
when we have access to all the information that we need without worrying about
where they live on the React components. In the [next](./getting-started-4.md)
part, we will further exploit this property of headless state management in the
realm of writing tests.
