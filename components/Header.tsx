
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center">
      <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
        3D Print Cost & Quote Tracker
      </h1>
      <p className="mt-2 text-lg text-slate-400">
        Calculate costs and manage your 3D printing projects with precision.
      </p>
    </header>
  );
};

export default Header;
