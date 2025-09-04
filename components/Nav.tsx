import React from 'react';

type View = 'calculator' | 'jobs' | 'filaments' | 'printers' | 'settings';

interface NavProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const Nav: React.FC<NavProps> = ({ currentView, onViewChange }) => {
  const buttonBaseClasses = "px-4 py-2 rounded-md font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500 text-sm sm:text-base";
  const activeClasses = "bg-cyan-500 text-white";
  const inactiveClasses = "bg-slate-700 hover:bg-slate-600 text-slate-300";
  
  const navItems: { view: View, label: string }[] = [
    { view: 'calculator', label: 'Calculator' },
    { view: 'jobs', label: 'Jobs' },
    { view: 'filaments', label: 'Filaments' },
    { view: 'printers', label: 'Printers' },
    { view: 'settings', label: 'Settings' }
  ];

  return (
    <nav className="flex justify-center my-6">
      <div className="flex flex-wrap justify-center space-x-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
        {navItems.map(item => (
           <button
              key={item.view}
              onClick={() => onViewChange(item.view)}
              className={`${buttonBaseClasses} ${currentView === item.view ? activeClasses : inactiveClasses}`}
            >
              {item.label}
            </button>
        ))}
      </div>
    </nav>
  );
};

export default Nav;
