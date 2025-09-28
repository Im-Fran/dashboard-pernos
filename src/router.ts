import { Home } from "@/pages/home";
import { DevicePage } from "@/pages/device";
import {createBrowserRouter} from "react-router";
import {Layout} from "@/layout.tsx";

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      {
        index: true,
        Component: Home
      },
      {
        path: 'dispositivos/:id',
        Component: DevicePage
      },
    ],
  },
])