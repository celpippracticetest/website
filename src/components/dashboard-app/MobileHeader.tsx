
import Menu from "@mui/icons-material/Menu";
import Close from "@mui/icons-material/Close";
import Logo from "@/components/ui/logo";

interface MobileHeaderProps {
  sidebarVisible: boolean;
  toggleSidebar: () => void;
  handleNavigation?: (page: string) => void;
}

const MobileHeader = ({ sidebarVisible, toggleSidebar, handleNavigation }: MobileHeaderProps) => {
  return (
    <div className="md:hidden flex items-center justify-between bg-[#1F2537] text-white p-4 sticky top-0 z-40">
      <div className="flex items-center">
        <button 
          onClick={() => handleNavigation && handleNavigation('dashboard')}
          className="cursor-pointer transition-opacity hover:opacity-80 focus:outline-none"
          aria-label="Go to Dashboard"
        >
          <Logo className="h-9 w-auto" />
        </button>
      </div>
      <button 
        onClick={toggleSidebar}
        className="text-white"
      >
        {sidebarVisible ? <Close sx={{ fontSize: 24 }} /> : <Menu sx={{ fontSize: 24 }} />}
      </button>
    </div>
  );
};

export default MobileHeader;
