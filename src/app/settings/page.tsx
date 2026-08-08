'use client';

import React from 'react';
import { UserManagementSettings } from '@/components/UserManagementSettings';

export default function SettingsPage() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <UserManagementSettings />
    </div>
  );
}
