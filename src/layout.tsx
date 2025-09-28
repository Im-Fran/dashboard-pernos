import {SidebarProvider} from "@/components/ui/sidebar.tsx";
import {AppSidebar} from "@/components/sidebar/app-sidebar.tsx";
import {Outlet} from "react-router";
import {ThemeProvider} from "@/components/providers/theme-provider.tsx";
import {FirestoreProvider} from "@/components/providers/firestore-provider.tsx";

export const Layout = () => <ThemeProvider>
  <FirestoreProvider>
    <SidebarProvider>
      <AppSidebar/>
      <main className={"p-4 w-full min-h-screen"}>
        <Outlet/>
      </main>
    </SidebarProvider>
  </FirestoreProvider>
</ThemeProvider>