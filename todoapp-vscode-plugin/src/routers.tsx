import { createHashRouter, Navigate } from "react-router-dom";

import App from "./todotree";

export default createHashRouter([
  {
    path: "/",
    element: <Navigate replace to="/todotree" />,
  },
  {
    path: "/todotree",
    element: <App />,
  },
]);
