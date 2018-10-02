// Defines the React 16 Adapter for Enzyme.
// http://airbnb.io/enzyme/#installation
const enzyme = require("enzyme");
const Adapter = require("enzyme-adapter-react-16");
enzyme.configure({ adapter: new Adapter() });
