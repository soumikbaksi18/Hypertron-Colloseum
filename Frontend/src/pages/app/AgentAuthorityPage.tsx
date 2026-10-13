import { AuthorityRail } from '../../components/AuthorityRail';
import { useConsoleContext } from '../../context/ConsoleContext';

export function AgentAuthorityPage() {
  const { profile, intents } = useConsoleContext();
  if (!profile) return null;
  return <AuthorityRail profile={profile} intents={intents} />;
}
