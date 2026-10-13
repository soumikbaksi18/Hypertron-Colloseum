export type StoredSignIn = {
  v: 1;
  domain: string;
  statement: string;
  uri: string;
  version: '1';
  nonce: string;
  issuedAt: string;
};

export type ParsedSignIn = {
  domain: string;
  address: string;
  statement?: string;
  uri?: string;
  version?: string;
  chainId?: string;
  nonce?: string;
  issuedAt?: string;
};

const DOMAIN = '(?<domain>[^\\n]+) wants you to sign in with your Solana account:\\n';
const ADDRESS = '(?<address>[^\\n]+)(?:\\n|$)';
const STATEMENT = '(?:\\n(?<statement>[\\S\\s]*?)(?:\\n|$))?';
const URI = '(?:\\nURI: (?<uri>[^\\n]+))?';
const VERSION = '(?:\\nVersion: (?<version>[^\\n]+))?';
const CHAIN_ID = '(?:\\nChain ID: (?<chainId>[^\\n]+))?';
const NONCE = '(?:\\nNonce: (?<nonce>[^\\n]+))?';
const ISSUED_AT = '(?:\\nIssued At: (?<issuedAt>[^\\n]+))?';
const EXPIRATION_TIME = '(?:\\nExpiration Time: (?<expirationTime>[^\\n]+))?';
const NOT_BEFORE = '(?:\\nNot Before: (?<notBefore>[^\\n]+))?';
const REQUEST_ID = '(?:\\nRequest ID: (?<requestId>[^\\n]+))?';
const RESOURCES = '(?:\\nResources:(?<resources>(?:\\n- [^\\n]+)*))?';
const MESSAGE = new RegExp(
  `^${DOMAIN}${ADDRESS}${STATEMENT}${URI}${VERSION}${CHAIN_ID}${NONCE}${ISSUED_AT}${EXPIRATION_TIME}${NOT_BEFORE}${REQUEST_ID}${RESOURCES}\\n*$`,
);

export function createSignInMessageText(input: {
  domain: string;
  address: string;
  statement?: string;
  uri?: string;
  version?: string;
  nonce?: string;
  issuedAt?: string;
}): string {
  let message = `${input.domain} wants you to sign in with your Solana account:\n`;
  message += input.address;
  if (input.statement) {
    message += `\n\n${input.statement}`;
  }

  const fields: string[] = [];
  if (input.uri) fields.push(`URI: ${input.uri}`);
  if (input.version) fields.push(`Version: ${input.version}`);
  if (input.nonce) fields.push(`Nonce: ${input.nonce}`);
  if (input.issuedAt) fields.push(`Issued At: ${input.issuedAt}`);
  if (fields.length) {
    message += `\n\n${fields.join('\n')}`;
  }
  return message;
}

export function parseSignInMessageText(text: string): ParsedSignIn | null {
  const match = MESSAGE.exec(text);
  const groups = match?.groups;
  if (!groups?.domain || !groups.address) return null;
  return {
    domain: groups.domain,
    address: groups.address,
    statement: groups.statement,
    uri: groups.uri,
    version: groups.version,
    chainId: groups.chainId,
    nonce: groups.nonce,
    issuedAt: groups.issuedAt,
  };
}
