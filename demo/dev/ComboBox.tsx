import React, { Component, ChangeEvent, ReactNode } from "react";
import randomId from "./utils/randomId";
import { observable, action } from "mobx";
import { syncFocusState, Input, DataQuery } from "../../src";

export interface DevComboBoxProps<TValue> {
  input: Input<TValue>;
  format: (value: TValue) => ReactNode;
  dataQuery?: DataQuery<string, any>;
  options: { value: TValue; label: ReactNode; id: string | number }[];
}

@syncFocusState((component: DecComboBox<any>) => ({
  el: component.el,
  focusState: component.props.input.focusState
}))
export default class DecComboBox<TValue> extends Component<
  DevComboBoxProps<TValue>
> {
  @observable
  isOpen = false;

  @observable
  hoverId = null as string | number | null;

  searchQuery = new Input("", {
    normalizer: value => value.trim()
  });

  render() {
    const { input, options, dataQuery, format } = this.props;
    const id = randomId();
    const isHoveredValidator = input.validators.some(
      validator => validator.hoverState.isHovered
    );

    return (
      <div
        style={{
          border: (isHoveredValidator ? 4 : 1) + "px solid black",
          margin: "1em",
          padding: isHoveredValidator
            ? "0em 1em 0em 1em"
            : "3px calc(1em + 3px) 3px calc(1em + 3px)",
          boxSizing: "border-box",
          display: "inline-block"
        }}
        onMouseOver={() => input.hoverState.reportHover()}
        onMouseOut={() => input.hoverState.reportUnhover()}
      >
        <p>
          <label htmlFor={id}>{input.name}</label>
        </p>
        {!this.isOpen && (
          <div
            onClick={action(() => {
              this.isOpen = true;
              input.focusState.focus();
            })}
          >
            {format(input.value)}
          </div>
        )}
        {this.isOpen ? (
          <input
            id={id}
            type="text"
            value={this.searchQuery.inputValue}
            onChange={action((ev: ChangeEvent<HTMLInputElement>) => {
              this.searchQuery.input(ev.target.value);
              dataQuery &&
                dataQuery.fetch(this.searchQuery.normalizedInputValue);
            })}
            onBlur={() => {
              input.focusState.reportBlur();
            }}
            onFocus={action(() => {
              input.focusState.reportFocus();
              this.isOpen = true;
            })}
            ref={el => {
              this.el = el;
            }}
          />
        ) : null}
        {this.isOpen && (
          <div
            style={{
              position: "absolute",
              width: "100%",
              height: "auto",
              backgroundColor: "white"
            }}
          >
            <ul>
              {options.map(option => (
                <li
                  key={option.id}
                  style={{
                    ...(option.id === this.hoverId && {
                      backgroundColor: "blue",
                      color: "white"
                    })
                  }}
                  onClick={action(() => {
                    input.confirm({ value: option.value });
                    this.isOpen = false;
                  })}
                  onMouseEnter={action(() => {
                    this.hoverId = option.id;
                  })}
                >
                  {option.label}
                </li>
              ))}
            </ul>
            {dataQuery &&
              dataQuery.hasMoreItems && (
                <button
                  type="button"
                  onClick={() => dataQuery.fetchMore()}
                  disabled={dataQuery.isFetching}
                >
                  {dataQuery.isFetching ? "loading..." : "load more"}
                </button>
              )}
            {dataQuery && (
              <p>
                Total:{" "}
                {dataQuery.totalItems === null ? "???" : dataQuery.totalItems}
              </p>
            )}
            {dataQuery &&
              !dataQuery.isFetching &&
              dataQuery.isError && (
                <p>
                  Error{" "}
                  <button type="button" onClick={() => dataQuery.fetchMore()}>
                    retry
                  </button>
                </p>
              )}
          </div>
        )}
        <p>Input value: {input.inputValue}</p>
        <p>Stable value: {input.value}</p>
        <p>{input.validators.length} validators</p>
      </div>
    );
  }

  @observable
  el: HTMLInputElement | null = null;
}
