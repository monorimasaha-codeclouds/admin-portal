import Sidebar from '@/components/Sidebar';
import AuthGuard from '@/components/AuthGuard';

export default function UsersLayout({ children }) {
  return (
    <AuthGuard>
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </AuthGuard>
  );
}
