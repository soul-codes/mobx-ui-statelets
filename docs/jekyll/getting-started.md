---
layout: default
title: Getting started
---

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
