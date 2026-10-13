import { keygenFromServer } from './prover';
import { sessionApi, type WalletSession } from './session';
import { loadShieldKeys, saveShieldKeys, type ShieldKeys } from './shield-keys';

export async function ensureShieldKeys(
  session: WalletSession,
): Promise<{ keys: ShieldKeys | null; session: WalletSession }> {
  const local = loadShieldKeys();
  if (local) {
    if (session.owner_pk !== local.ownerPk || session.view_pub !== local.viewPub) {
      const next = await sessionApi.updateMe({
        viewPub: local.viewPub,
        ownerPk: local.ownerPk,
      });
      return { keys: local, session: next };
    }
    return { keys: local, session };
  }
  if (session.owner_pk) {
    return { keys: null, session };
  }
  const generated = await keygenFromServer();
  const keys: ShieldKeys = {
    spendSk: generated.spend_sk,
    viewSecret: generated.view_secret,
    viewPub: generated.view_pub,
    ownerPk: generated.owner_pk,
  };
  saveShieldKeys(keys);
  const next = await sessionApi.updateMe({
    viewPub: keys.viewPub,
    ownerPk: keys.ownerPk,
  });
  return { keys, session: next };
}
