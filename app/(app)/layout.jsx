import BottomTabBar from "@/components/BottomTabBar";

export default function AppShellLayout({ children }) {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-white pb-20 shadow-sm">
      {children}
      <BottomTabBar />
    </div>
  );
}
