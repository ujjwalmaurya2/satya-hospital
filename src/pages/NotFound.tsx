import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center mx-auto">
          <Activity className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-[#243447]">404</h1>
        <h2 className="text-lg font-bold text-[#243447]">Page Not Found</h2>
        <p className="text-xs text-[#667085]">
          The medical portal page you requested does not exist or has been relocated.
        </p>
        <div className="pt-2">
          <Link to="/">
            <Button variant="primary" size="md" leftIcon={<Home className="w-4 h-4" />}>
              Return to Hospital Homepage
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
