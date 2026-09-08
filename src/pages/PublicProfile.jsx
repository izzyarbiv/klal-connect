import React from 'react';
import { useParams } from 'react-router-dom';
import ProfilePage from '@/components/profile/ProfilePage';

export default function PublicProfile() {
  const { id } = useParams();
  return <ProfilePage userId={id}/>;
}
