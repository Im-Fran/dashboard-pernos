import {DevicesPreview} from "@/pages/home/components/devices-preview.tsx";
import {SidebarTrigger} from "@/components/ui/sidebar.tsx";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb.tsx";

export const Home = () => <div>
  <div className={"flex items-center justify-between"}>
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <SidebarTrigger />
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbPage>Monitoreo de Sensores</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  </div>

  <div className={"mt-6 px-2"}>
    <DevicesPreview />
  </div>
</div>
