import { redirect } from "next/navigation";

// Middleware already sends signed-out visitors to /login; anyone who reaches
// here is signed in, so just land them on the dashboard.
export default function RootPage() {
  redirect("/dashboard");
}
