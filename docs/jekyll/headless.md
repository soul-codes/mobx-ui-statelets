---
layout: default
title: Introduction to headless state management
---

# Introduction to headless state management

This article describes the basic idea of headless state management that is the
principle behind {{site.github.repository_name}}.

## The basic idea

> _Never trust anything that can think for itself if you can't see where it keeps its brain_.
>
> -- J.K. Rowling, Harry Potter and the Chamber of Secrets

React components encapsulate their own state, so it's completely possible to
write a web application using React itself to do state management.

When an application grows and and the state landscape becomes more complex,
storing state in components can become unwieldy. For this reason, state
management libraries such as [MobX](https://github.com/mobxjs/mobx) and
[Redux](https://redux.js.org/) offer ways to define application state out of
the React component hierarchy.

This creates a situation where some of the application state lives inside React
components, and others live in isolated stores (or in case of Redux, one single store).
Opinions vary on which state lives where, but one prevailing consensus is:
put _domain state_ (state to do with the application's _data_) in the isolated
stores, and keep the _UI state_ on the components.

Headless state management encourages a more aggressive use of isolated state stores
for _both_ domain and UI state. In some plausible extreme case, React components
may be fully stateless.

The objective is to give developers a full perspective of the application's domain
_and_ UI state without coupling any of it to React components.

## Criteria for making state headless

With headless state management, we move state out of React components if the
nature of that state matches any of the following criteria:

1. The state is consumed by a sibling, a parent or a cousin component.
1. The state persists after the component unmounts.
1. The state affects how other headless state gets updated.

The rationale is that each of these criteria violates the encapsulation
characteristics intended of React component state: private to the component
and its chilldren, and dies with the component. This violation is in fact
a rationale for moving domain state out of the React component hierarchy.
What we do now is to do the same for any qualifying UI state.

## The elements of headless state management

To obtain maximal benefits, a headless state architecture should:

1. describe the application as fully a possible
1. provide clear "user entry" methods that executes the entire sequence of
   state transition as a consequence of a user interaction.
1. keep its knowledge of any relevant DOM state in sync.
1. allow manipulation of DOM state while being agnostic of any visual component.

### User entry methods

There should be methods that update the application state exactly the same way
as if a user were actually interact with the application.

For instance, in a hypothetical "todo" application, the user may be able to add
a new todo item by clicking on an "add" button, or by hitting enter key while
focused on a text input that has the new todo item. We would provide a method
outside the React component hierarchy to handle the consequence: updating the
list of todos (domain state) as well as clearing the last input value (UI state).

### Keeping DOM state in sync

One obstacle in the way of handling an application state headlessly is that
some application state has its single source of truth in the DOM. To name a few:

- Hover state
- Focus state
- Scroll state
- Text selection state
- Media playback state

If there is application logic that depends on these kinds of DOM state, we
provide a way for React components to report changes back into our
headless state hierarchy, so that we can handle all logic in one place. This
can be achieved by simple callbacks.

### Manipulating DOM state from headless state

Another obstcale is the reverse: we want to be able to reflect the update of
headless state in the corresponding DOM state.

However, we want to do this without actually knowing anything about the
visual components reflecting our state. This can be solved with a pattern where
a React component registers itself as a "projection" of our application state and
subscribe callbacks that manipulate the DOM on command of our user entry
methods.

## Advantages of headless state management

### Simple components

By going fully headless, we remove any need to perform [state lifting](https://reactjs.org/docs/lifting-state-up.html), which can generate a large
technical footprint in the code relative to the actual UI logic.

With full headlessness, the only components that remain are simple stateless
components, and the components that map the headless state into them.

### Simple tests

When state is inside React components, we test consequence of interactions by
simulating events and inspecting the effects on various component props. This
can involve complex digging through the component hierarchy. Integration test
becomes difficult, and gets more difficult as the state gets lifted higher
and higher.

Headless state management lets us write tests about the application without
needing to mount React components. Instead, we directly test the state transitions
by invoking user entry methods and then inspecting the consequences at state-level.
This allows for very expressive and wide-ranging integration tests on the
application logic. _Then_ we only need to unit-test the individual mapper
components that they are talking to these state entities properly.

### Simple debugging

By exporting our headless state as a global in development time, we no longer
need to dig through the React component hierarchy to find the right state to
manipulate or inspect. Your headless state object will contain all the information
we need to know about the expected state of the application, and ideally also the
methods needed to manipulate them.

### Resilience to requirement changes

With state lifting, if the components that consume a common state moves owing to
requirement changes, we need to rewiring the state lifting. In addition,
if a shared state is no longer shared, we feel tempted to move it back into a
local component state, where it becomes easier to reason about. Each such change
requires as many API changes on components as needed to traverse the
component hierarchy.

Headless state management gives us another level of concern separation that removes
these problems completely. It doesn't matter if a state is used once, twice or
not at all. Their existence are separate from the React components, so changes
at visual level will touch at most what state gets provided to the components.

### Empowering experimentation

Since headless state describes the application fully, it becomes easy to produce
an "ugly but functionally accurate prototype" by taking time to engineer the
state transitions in isolation -- which becomes a lot easier -- and wiring them
into half-finished visual components.

## You might not need headless state

If the scope of your project is small, simple with fixed requirements, headless
state management might just add an unnecessary overhead. Use
[the criteria above](#criteria-for-making-state-headless) to determine if state
lifting is appropriate.

Typically, an application that involves form components will eventually reach
the kind of UI state complexity that headless state can help simplify. This is
especially true if you intend to refine form user experience.
