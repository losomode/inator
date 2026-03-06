/** User profile from USERinator /api/users/me/ */
export interface UserProfile {
  user_id: number;
  username: string;
  email: string;
  company: {
    id: number;
    name: string;
  };
  display_name: string;
  avatar_url: string;
  phone: string;
  bio: string;
  job_title: string;
  department: string;
  location: string;
  role_name: string;
  role_level: number;
  timezone: string;
  language: string;
  notification_email: boolean;
  notification_in_app: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Company from USERinator /api/companies/ */
export interface Company {
  id: number;
  name: string;
  domain: string;
  logo_url: string;
  is_active: boolean;
  created_at: string;
}

/** User invitation from USERinator /api/invitations/ */
export interface Invitation {
  id: number;
  email: string;
  company: number;
  company_name: string;
  role_name: string;
  role_level: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  invited_by: number;
  reviewed_by: number | null;
  created_at: string;
  expires_at: string;
}

/** User preferences subset */
export interface UserPreferences {
  timezone: string;
  language: string;
  notification_email: boolean;
  notification_in_app: boolean;
}
