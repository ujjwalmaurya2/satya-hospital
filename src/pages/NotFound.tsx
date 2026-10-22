import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 bg-[#FCFDFB]">
      <div className="max-w-md w-full text-center space-y-4 bg-white p-8 rounded-3xl border border-sky-100 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-[#EBF6FC] text-[#3DA9DF] flex items-center justify-center mx-auto">
          <Activity className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-extrabold text-[#193247]">404</h1>
        <h2 className="text-xl font-bold text-[#193247]">Page Not Found</h2>
        <p className="text-sm text-[#647785]">
          The medical portal page you requested does not exist or has been relocated to our pediatric care directory.
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
