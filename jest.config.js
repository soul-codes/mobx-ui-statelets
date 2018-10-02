// https://facebook.github.io/jest/docs/en/configuration.html
module.exports = {
  moduleFileExtensions: ["ts", "tsx", "js"],
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
  moduleNameMapper: {
    "mobx-ui-statelets": "<rootDir>/src"
  },
  testMatch: ["**/__tests__/**/*.test.ts?(x)"],
  setupFiles: ["<rootDir>/jest.setup.js"]
};
