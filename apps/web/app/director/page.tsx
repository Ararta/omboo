import { getSession } from "../../lib/session";
import { DirectorDashboard } from "../../components/director/DirectorDashboard";

export default function DirectorPage() {
  const session = getSession();
  return <DirectorDashboard isPlatformOwner={session?.isPlatformOwner ?? false} />;
}
