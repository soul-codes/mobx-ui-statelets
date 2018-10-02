import AppState from "../AppState";

test("active input is not assigned initially", () => {
  const appState = new AppState();
  expect(appState.activeInput).toBeFalsy();
});

test("hover on email input makes it active, unhover unassigns it", () => {
  const appState = new AppState();
  appState.email.hoverState.reportHover();
  expect(appState.activeInput).toBe(appState.email);

  appState.email.hoverState.reportUnhover();
  expect(appState.activeInput).toBeFalsy();
});

test("hover on email input while focusing on name input makes name input active", () => {
  const appState = new AppState();
  appState.email.hoverState.reportHover();
  appState.name.focusState.reportFocus();
  expect(appState.activeInput).toBe(appState.name);

  appState.name.focusState.reportBlur();
  expect(appState.activeInput).toBe(appState.email);
});
