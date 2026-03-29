import { Outlet } from 'react-router-dom';
import FloatingMenu from './FloatingMenu.tsx';

const Layout = () => {
    return (
        <div className="min-h-[100dvh] w-full relative bg-slate-50 flex">
            <main className="flex-1 w-full relative">
                <Outlet />
            </main>
            <FloatingMenu />
        </div>
    );
};

export default Layout;
