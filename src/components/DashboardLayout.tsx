import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import SearchBar from './SearchBar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { signOut } = useAuth();
  logger.methodEntry('DashboardLayout');

  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-4">
          <h1 className="text-xl font-bold">AutoCRM</h1>
        </div>
        <nav className="mt-4">
          <Link
            to="/dashboard"
            className={`flex items-center px-4 py-2 ${
              isActive('/dashboard') ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
            }`}
          >
            <span className="mr-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </span>
            Dashboard
          </Link>
          <Link
            to="/tickets"
            className={`flex items-center px-4 py-2 ${
              isActive('/tickets') ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
            }`}
          >
            <span className="mr-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" stroke="currentColor" strokeWidth="2"/>
                <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5C15 6.10457 14.1046 7 13 7H11C9.89543 7 9 6.10457 9 5Z" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </span>
            Tickets
          </Link>
          <Link
            to="/customers"
            className={`flex items-center px-4 py-2 ${
              isActive('/customers') ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
            }`}
          >
            <span className="mr-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 21V19C17 16.7909 15.2091 15 13 15H5C2.79086 15 1 16.7909 1 19V21" stroke="currentColor" strokeWidth="2"/>
                <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </span>
            Customers
          </Link>
          <Link
            to="/settings"
            className={`flex items-center px-4 py-2 ${
              isActive('/settings') ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
            }`}
          >
            <span className="mr-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M19.4 15C19.1277 15.6171 19.2583 16.3378 19.73 16.83L19.79 16.89C20.1656 17.2656 20.3766 17.7646 20.3766 18.285C20.3766 18.8054 20.1656 19.3044 19.79 19.68C19.4144 20.0556 18.9154 20.2666 18.395 20.2666C17.8746 20.2666 17.3756 20.0556 17 19.68L16.94 19.62C16.4478 19.1483 15.7271 19.0177 15.11 19.29C14.5138 19.5414 14.1299 20.1314 14.13 20.78V21C14.13 22.1046 13.2346 23 12.13 23C11.0254 23 10.13 22.1046 10.13 21V20.91C10.1216 20.2425 9.71601 19.6475 9.1 19.4C8.48293 19.1277 7.76217 19.2583 7.27 19.73L7.21 19.79C6.83435 20.1656 6.33542 20.3766 5.815 20.3766C5.29458 20.3766 4.79565 20.1656 4.42 19.79C4.04435 19.4144 3.83337 18.9154 3.83337 18.395C3.83337 17.8746 4.04435 17.3756 4.42 17L4.48 16.94C4.95167 16.4478 5.08231 15.7271 4.81 15.11C4.55859 14.5138 3.96858 14.1299 3.32 14.13H3C1.89543 14.13 1 13.2346 1 12.13C1 11.0254 1.89543 10.13 3 10.13H3.09C3.75753 10.1216 4.35247 9.71601 4.6 9.1C4.87231 8.48293 4.74167 7.76217 4.27 7.27L4.21 7.21C3.83435 6.83435 3.62337 6.33542 3.62337 5.815C3.62337 5.29458 3.83435 4.79565 4.21 4.42C4.58565 4.04435 5.08458 3.83337 5.605 3.83337C6.12542 3.83337 6.62435 4.04435 7 4.42L7.06 4.48C7.55217 4.95167 8.27293 5.08231 8.89 4.81H9C9.59624 4.55859 9.98013 3.96858 9.98 3.32V3C9.98 1.89543 10.8754 1 11.98 1C13.0846 1 13.98 1.89543 13.98 3V3.09C13.9799 3.73858 14.3638 4.32858 14.96 4.58C15.5771 4.85231 16.2978 4.72167 16.79 4.25L16.85 4.19C17.2256 3.81435 17.7246 3.60337 18.245 3.60337C18.7654 3.60337 19.2644 3.81435 19.64 4.19C20.0156 4.56565 20.2266 5.06458 20.2266 5.585C20.2266 6.10542 20.0156 6.60435 19.64 6.98L19.58 7.04C19.1083 7.53217 18.9777 8.25293 19.25 8.87V8.98C19.5014 9.57624 20.0914 9.96013 20.74 9.96H21C22.1046 9.96 23 10.8554 23 11.96C23 13.0646 22.1046 13.96 21 13.96H20.91C20.2614 13.9599 19.6714 14.3438 19.4 14.94V15Z" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </span>
            Settings
          </Link>
          <button
            onClick={() => signOut()}
            className="flex items-center px-4 py-2 w-full text-gray-600 bg-white hover:bg-pink-50 hover:text-red-600"
          >
            <span className="mr-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            Logout
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white shadow">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <SearchBar />
            <div className="flex items-center">
              <button
                type="button"
                className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                New Ticket
              </button>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout; 