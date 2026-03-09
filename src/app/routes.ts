import { createBrowserRouter } from "react-router";
import { RootLayout } from "./layout";
import { Home } from "./screens/Home";
import { Videos } from "./screens/Videos";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Home },
      { path: "videos", Component: Videos },
    ],
  },
]);
