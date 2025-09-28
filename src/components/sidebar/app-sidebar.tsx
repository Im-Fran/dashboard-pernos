import {
  Sidebar,
  SidebarContent, SidebarFooter,
  SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem
} from "@/components/ui/sidebar.tsx";
import {Home, Sun, Moon, Monitor, Cpu} from "lucide-react";
import {Link} from "react-router";
import {useTheme} from "@/hooks/use-theme.ts";
import {useCollection} from "@/hooks/use-firestore.ts";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import type { Device } from "@/types/models/device";

const items = [
  {
    title: 'Resumen',
    url: '/',
    icon: Home,
  },
]

export const AppSidebar = () => {

  const { theme, setTheme } = useTheme()
  const { data: devices, loading: devicesLoading } = useCollection('devices')

  const themeOptions = [
    { name: 'Claro', value: 'light' as const, icon: Sun },
    { name: 'Oscuro', value: 'dark' as const, icon: Moon },
    { name: 'Sistema', value: 'system' as const, icon: Monitor },
  ]

  const currentTheme = themeOptions.find(option => option.value === theme)

  return <Sidebar variant={"floating"}>
    <SidebarHeader className={"px-4"}>
      <div className={"text-lg font-medium"}>Dashboard Pernos</div>
    </SidebarHeader>
    <hr/>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map(item => <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <Link to={item.url}>
                  <item.icon/>
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>)}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Dispositivos</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {devicesLoading ? (
              <SidebarMenuItem>
                <SidebarMenuButton disabled>
                  <div className="animate-pulse flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-300 rounded"></div>
                    <div className="w-20 h-3 bg-gray-300 rounded"></div>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ) : devices && devices.length > 0 ? (
              devices.map((device) => {
                const deviceData = device as Device;
                return (
                  <SidebarMenuItem key={deviceData.id}>
                    <SidebarMenuButton asChild>
                      <Link to={`/dispositivos/${deviceData.id}`}>
                        <Cpu className="w-4 h-4" />
                        <span className="truncate">{deviceData.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })
            ) : (
              <SidebarMenuItem>
                <SidebarMenuButton disabled>
                  <span className="text-muted-foreground text-sm">No hay dispositivos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>
      <SidebarGroup>
        <SidebarGroupLabel>Tema</SidebarGroupLabel>
        <SidebarGroupContent>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="w-full">
              <SelectValue>
                <div className="flex items-center gap-2">
                  {currentTheme && (
                    <>
                      <currentTheme.icon className="h-4 w-4" />
                      <span>{currentTheme.name}</span>
                    </>
                  )}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {themeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <option.icon className="h-4 w-4" />
                    <span>{option.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarFooter>
  </Sidebar>
}