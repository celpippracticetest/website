type SectionHeaderProps = {
  title: string;
  icon: React.ReactNode;
  iconBgColor: string;
};

const SectionHeader = ({ title, icon, iconBgColor }: SectionHeaderProps) => {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className={`${iconBgColor} p-1.5 sm:p-2 rounded-full`}>
        {icon}
      </div>
      <h3 className="text-xl sm:text-2xl font-bold text-gray-800">{title}</h3>
    </div>
  );
};

export default SectionHeader;
