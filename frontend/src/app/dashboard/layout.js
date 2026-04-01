import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';

export default function DashboardLayout({ children }) {
  return (
    <AuthGuard>
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </AuthGuard>
  );
}
