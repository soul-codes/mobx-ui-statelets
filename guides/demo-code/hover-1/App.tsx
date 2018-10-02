import React, { Component } from "react";
import { observer } from "mobx-react";
import AppState from "./AppState";

const style = `
.hoverable {
  flex: 1;
  border:1px solid red;
  padding: 30px;
  margin: 30px;
}

.hover_flex {
  display: flex;
}
`;

@observer
export default class App extends Component<{ appState: AppState }> {
  render() {
    const { appState } = this.props;
    const hoveredContent = appState.hoverState1.isHovered
      ? "A"
      : appState.hoverState2.isHovered
        ? "B"
        : "nothing";
    const styleContent = { __html: style };
    return (
      <div>
        <div className="hover_flex">
          {" "}
          <div
            className="hoverable"
            onMouseEnter={() => appState.hoverState1.reportHover()}
            onMouseLeave={() => appState.hoverState1.reportUnhover()}
          >
            I'm A. Hover on me.
          </div>
          <div
            className="hoverable"
            onMouseEnter={() => appState.hoverState2.reportHover()}
            onMouseLeave={() => appState.hoverState2.reportUnhover()}
          >
            I'm B. Hover on me.
          </div>
        </div>

        <p>Hovering on {hoveredContent}.</p>
        <style dangerouslySetInnerHTML={styleContent} />
      </div>
    );
  }
}
