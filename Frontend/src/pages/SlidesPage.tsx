import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';

import { HypertronLogoMark } from '../dashboard/logo-mark';
import './SlidesPage.css';

const PROGRAM_ID = '9HQsgGDHgYw3N8PGnh9EWrUGRHgmp7tmdGaxuBHHA335';
const USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
const NOTES_KEY = 'hypertron.slides.notes';
const EASE = [0.22, 1, 0.36, 1] as const;

type RecordRow = {
  field: string;
  value: string;
  withheld?: boolean;
};

type SlideViewProps = { beat: number };

type Slide = {
  id: string;
  rail: string;
  notes: string;
  beats: number;
  View: (props: SlideViewProps) => ReactNode;
};

function Beat({
  visible,
  children,
  kind = 'block',
}: {
  visible: boolean;
  children: ReactNode;
  kind?: 'block' | 'item' | 'row';
}) {
  const reduce = useReducedMotion();
  const Comp = kind === 'row' ? motion.tr : kind === 'item' ? motion.li : motion.div;
  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <Comp
          initial={reduce ? false : { opacity: 0, y: kind === 'row' ? 0 : 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: kind === 'row' ? 0 : -10 }}
          transition={{ duration: reduce ? 0.01 : 0.38, ease: EASE }}
        >
          {children}
        </Comp>
      ) : null}
    </AnimatePresence>
  );
}

function PublicRecord({
  caption,
  rows,
  showPublic,
  showWithheld,
}: {
  caption: string;
  rows: RecordRow[];
  showPublic: boolean;
  showWithheld: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {showPublic ? (
        <motion.figure
          className="slides-record"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: 8 }}
          transition={{ duration: reduce ? 0.01 : 0.4, ease: EASE }}
        >
          <figcaption>
            <span>Public record</span>
            <span>{caption}</span>
          </figcaption>
          <ul>
            {rows.map((row, index) => {
              const on = row.withheld ? showWithheld : true;
              return (
                <li
                  key={`${row.field}-${index}`}
                  data-withheld={on && row.withheld ? 'true' : 'false'}
                >
                  <span>{row.field}</span>
                  <motion.span
                    initial={false}
                    animate={{ opacity: on ? 1 : 0 }}
                    transition={{ duration: reduce ? 0.01 : 0.28, ease: EASE }}
                  >
                    {row.value}
                  </motion.span>
                </li>
              );
            })}
          </ul>
        </motion.figure>
      ) : null}
    </AnimatePresence>
  );
}

function TitleSlide({ beat }: SlideViewProps) {
  return (
    <>
      <p className="slides-eyebrow">Technical demonstration</p>
      <h1 className="slides-title" tabIndex={-1}>
        Private settlement
        <br />
        on a public chain.
      </h1>
      <Beat visible={beat >= 1}>
        <p className="slides-lede">
          Hypertron vaults devnet USDC in one Anchor program and moves the value
          as notes. A send settles as a nullifier and two new commitments.
        </p>
      </Beat>
      <Beat visible={beat >= 2}>
        <dl className="slides-identity">
          <div>
            <dt>Program</dt>
            <dd>hypertron_pool</dd>
          </div>
          <div>
            <dt>Program id</dt>
            <dd className="slides-id">{PROGRAM_ID}</dd>
          </div>
          <div>
            <dt>Cluster</dt>
            <dd>Solana devnet</dd>
          </div>
          <div>
            <dt>Mint</dt>
            <dd className="slides-id">{USDC_MINT}</dd>
          </div>
          <div>
            <dt>Proof</dt>
            <dd>Groth16 · BN254 · 256 bytes</dd>
          </div>
          <div>
            <dt>Tree</dt>
            <dd>Poseidon · depth 20</dd>
          </div>
        </dl>
      </Beat>
    </>
  );
}

function RunSlide({ beat }: SlideViewProps) {
  const steps = [
    {
      verb: 'Sign in',
      detail:
        'Phantom signs the SIWS challenge. The browser generates a spend key and a viewing key, then publishes owner_pk and view_pub.',
    },
    {
      verb: 'Add money',
      detail:
        'Phantom signs a USDC deposit into the vault. The amount and the depositor address are on that transaction. Say so before the signature.',
    },
    {
      verb: 'Pay the link',
      detail:
        'Checkout sends a note to the merchant owner_pk. The relayer is the fee payer. The instruction accounts are the pool, the tree, and the nullifier PDAs.',
    },
    {
      verb: 'Read the log',
      detail:
        'Open the explorer transaction and walk the fields: nullifier, two commitments, ciphertext.',
    },
  ];

  return (
    <>
      <p className="slides-eyebrow">Run of show</p>
      <h1 className="slides-title" tabIndex={-1}>
        Four beats, in this order.
      </h1>
      <ol className="slides-steps">
        {steps.map((step, index) => (
          <Beat key={step.verb} visible={beat >= index + 1} kind="item">
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h2>{step.verb}</h2>
              <p>{step.detail}</p>
            </div>
          </Beat>
        ))}
      </ol>
    </>
  );
}

function NoteSlide({ beat }: SlideViewProps) {
  const keys = [
    ['spend_sk', 'Produces the nullifier. Stays in this browser.'],
    ['view_secret', 'Decrypts the blob. Spending still takes the spend key.'],
    ['k', 'Blinds this note. Fresh for every output.'],
  ];
  const rows = [
    ['owner_pk', 'Poseidon(spend_sk, 0)'],
    ['commitment', 'Poseidon(Poseidon(owner_pk, k), v)'],
    ['nullifier', 'Poseidon(spend_sk, k)'],
  ];

  return (
    <>
      <p className="slides-eyebrow">Note</p>
      <h1 className="slides-title" tabIndex={-1}>
        Value is a note, with three field elements.
      </h1>
      <div className="slides-split">
        <div>
          <Beat visible={beat >= 1}>
            <p className="slides-lede">
              The encrypted blob carries owner_pk, k, and v. Encryption is
              X25519, a SHA-256 key derivation, and ChaCha20-Poly1305.
            </p>
          </Beat>
          <ul className="slides-keys">
            {keys.map(([name, copy], index) => (
              <Beat key={name} visible={beat >= index + 2} kind="item">
                <h2>{name}</h2>
                <p>{copy}</p>
              </Beat>
            ))}
          </ul>
        </div>
        <Beat visible={beat >= 5}>
          <figure className="slides-eq">
            <figcaption>Field elements</figcaption>
            <ul>
              {rows.map(([name, expr], index) => (
                <Beat key={name} visible={beat >= 5 + index} kind="item">
                  <span>{name}</span>
                  <code>{expr}</code>
                </Beat>
              ))}
            </ul>
          </figure>
        </Beat>
      </div>
    </>
  );
}

function BoundsSlide({ beat }: SlideViewProps) {
  const places = [
    {
      name: 'Browser',
      holds: 'spend_sk, view_secret, and the open note book.',
      does: 'Proves in WASM when the prover package is loaded.',
    },
    {
      name: 'Server',
      holds: 'SIWS session, invoices, owner_pk, view_pub, relayer key.',
      does: 'Builds the deposit transaction and relays the fee.',
    },
    {
      name: 'Chain',
      holds: 'Vault, Merkle tree, nullifier PDAs, verifying keys, ciphertext.',
      does: 'Verifies Groth16 and moves USDC on deposit and cash out.',
    },
    {
      name: 'Indexer',
      holds: 'Leaves, nullifiers, and blobs parsed from program logs.',
      does: 'Serves a public copy of what the logs already contain.',
    },
  ];

  return (
    <>
      <p className="slides-eyebrow">Trust</p>
      <h1 className="slides-title" tabIndex={-1}>
        Where the payment lives.
      </h1>
      <div className="slides-bounds">
        {places.map((place, index) => (
          <div key={place.name}>
            <Beat visible={beat >= index + 1}>
              <article>
                <h2>{place.name}</h2>
                <p>
                  <span>Holds</span>
                  {place.holds}
                </p>
                <p>
                  <span>Does</span>
                  {place.does}
                </p>
              </article>
            </Beat>
          </div>
        ))}
      </div>
    </>
  );
}

const DEPOSIT_ROWS: RecordRow[] = [
  { field: 'depositor', value: 'Phantom address' },
  { field: 'amount', value: 'bucket-snapped USDC' },
  { field: 'commitment', value: 'new Merkle leaf' },
  { field: 'proof', value: 'Groth16 [cm, amount]' },
  { field: 'k', value: 'withheld', withheld: true },
  { field: 'spend_sk', value: 'withheld', withheld: true },
];

function DepositSlide({ beat }: SlideViewProps) {
  const steps = [
    'The browser samples k and proves DepositCircuit. Public inputs are the commitment and the amount.',
    'The note is encrypted to the depositor’s own view_pub.',
    'The server returns an unsigned transaction. Phantom signs the USDC transfer into the vault.',
    'The program verifies the proof, accepts the tokens, and appends the leaf.',
  ];

  return (
    <>
      <p className="slides-eyebrow">Add money · VK 1</p>
      <h1 className="slides-title" tabIndex={-1}>
        Adding money is the public edge.
      </h1>
      <div className="slides-split">
        <div>
          <ol className="slides-flow">
            {steps.map((step, index) => (
              <Beat key={step} visible={beat >= index + 1} kind="item">
                {step}
              </Beat>
            ))}
          </ol>
          <Beat visible={beat >= 5}>
            <p className="slides-aside">
              Amounts under 10 USDC snap up to 0.1, 0.5, 1, 5, or 10. Cash out
              is the other public edge: the withdraw instruction publishes the
              amount and the recipient address.
            </p>
          </Beat>
        </div>
        <PublicRecord
          caption="deposit"
          rows={DEPOSIT_ROWS}
          showPublic={beat >= 6}
          showWithheld={beat >= 7}
        />
      </div>
    </>
  );
}

const SEND_ROWS: RecordRow[] = [
  { field: 'root', value: 'a recent Merkle root' },
  { field: 'nullifier', value: 'spent-note PDA' },
  { field: 'commitment', value: 'payment leaf' },
  { field: 'commitment', value: 'change leaf' },
  { field: 'blob', value: 'ciphertext' },
  { field: 'amount', value: 'withheld', withheld: true },
  { field: 'wallets', value: 'withheld', withheld: true },
];

function SendSlide({ beat }: SlideViewProps) {
  return (
    <>
      <p className="slides-eyebrow">Send</p>
      <h1 className="slides-title" tabIndex={-1}>
        Send writes two notes and moves no tokens.
      </h1>
      <div className="slides-split">
        <div>
          <Beat visible={beat >= 1}>
            <p className="slides-lede">
              One input note uses transfer_one, verifying key 5. Two input notes
              use transfer, verifying key 4. Both outputs are a payment and
              change. The circuit checks that the input values sum to the output
              values.
            </p>
          </Beat>
          <Beat visible={beat >= 2}>
            <p className="slides-aside">
              The relayer pays the Solana fee and submits the instruction. The
              vault balance is unchanged.
            </p>
          </Beat>
        </div>
        <PublicRecord
          caption="transfer"
          rows={SEND_ROWS}
          showPublic={beat >= 3}
          showWithheld={beat >= 4}
        />
      </div>
    </>
  );
}

const PAY_ROWS: RecordRow[] = [
  { field: 'nullifier', value: 'spent-note PDA' },
  { field: 'commitment', value: 'merchant note' },
  { field: 'commitment', value: 'change note' },
  { field: 'blob', value: 'ciphertext' },
  { field: 'amount', value: 'withheld', withheld: true },
  { field: 'payout', value: 'withheld', withheld: true },
  { field: 'payer', value: 'withheld', withheld: true },
];

function PaySlide({ beat }: SlideViewProps) {
  const steps = [
    'The merchant creates a link. The hosted page shows the amount, the memo, owner_pk, and view_pub.',
    'The payout Solana address stays on the merchant session.',
    'A short private balance adds money first. That deposit is public. The send after it is the payment.',
    'The transfer request includes the output amount and owner_pk so the server can mark the invoice paid.',
  ];

  return (
    <>
      <p className="slides-eyebrow">Checkout · /pay/:id</p>
      <h1 className="slides-title" tabIndex={-1}>
        A payment link is an in-pool send.
      </h1>
      <div className="slides-split">
        <div>
          <ol className="slides-flow">
            {steps.map((step, index) => (
              <Beat key={step} visible={beat >= index + 1} kind="item">
                {step}
              </Beat>
            ))}
          </ol>
        </div>
        <PublicRecord
          caption="the send"
          rows={PAY_ROWS}
          showPublic={beat >= 5}
          showWithheld={beat >= 6}
        />
      </div>
    </>
  );
}

function ReadersSlide({ beat }: SlideViewProps) {
  const rows = [
    ['Chain observer', 'Deposit amount and depositor. On send: root, nullifiers, commitments, ciphertext.', 'Verify the proof against the on-chain key.'],
    ['Server', 'Session wallet, invoice, and the output amount and owner_pk sent with the proof.', 'Relay the fee and mark the invoice paid.'],
    ['Recipient', 'Decrypted owner_pk, k, and v for notes addressed to their view key.', 'Spend with their own spend key.'],
    ['Viewing key', 'The same opening, shared with an auditor.', 'Read the note. The nullifier still requires spend_sk.'],
  ];

  return (
    <>
      <p className="slides-eyebrow">Readers</p>
      <h1 className="slides-title" tabIndex={-1}>
        Same payment, four readers.
      </h1>
      <table className="slides-table">
        <thead>
          <tr>
            <th>Reader</th>
            <th>Holds</th>
            <th>Can</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([reader, holds, can], index) => (
            <Beat key={reader} visible={beat >= index + 1} kind="row">
              <th scope="row">{reader}</th>
              <td>{holds}</td>
              <td>{can}</td>
            </Beat>
          ))}
        </tbody>
      </table>
    </>
  );
}

function LiveSlide({ beat }: SlideViewProps) {
  return (
    <>
      <p className="slides-eyebrow">On devnet now</p>
      <h1 className="slides-title" tabIndex={-1}>
        Open the workspace and run the four beats.
      </h1>
      <Beat visible={beat >= 1}>
        <p className="slides-lede">
          Sign in, add money, pay a link, then read the send transaction in the
          explorer. The deck stays on this URL.
        </p>
      </Beat>
      <Beat visible={beat >= 2}>
        <div className="slides-live">
          <Link to="/app" target="_blank" rel="noreferrer">
            Open workspace
          </Link>
          <p>
            Program <span className="slides-id">{PROGRAM_ID}</span>
          </p>
        </div>
      </Beat>
    </>
  );
}

const SLIDES: Slide[] = [
  {
    id: 'title',
    rail: 'Open',
    beats: 3,
    notes:
      'Hypertron is a shielded pool. Deposits and cash-outs publish amounts. Sends between them are notes. We will do one payment and then read the transaction.',
    View: TitleSlide,
  },
  {
    id: 'run',
    rail: 'Run',
    beats: 5,
    notes:
      'Call out the public deposit before Phantom signs it. The private beat is the payment link, and the proof is the explorer view of that send.',
    View: RunSlide,
  },
  {
    id: 'note',
    rail: 'Note',
    beats: 8,
    notes:
      'Commitment hides owner, blinding, and value. The nullifier is the spend key and the same blinding, so a viewing key can read a note and still cannot spend it.',
    View: NoteSlide,
  },
  {
    id: 'bounds',
    rail: 'Bounds',
    beats: 5,
    notes:
      'On this path the browser proves. If WASM is missing, the server prove routes accept the spend key. Recipient sync uses the server note book written by the transfer endpoint. The indexer parses PrivateTransfer; transfer_one is a separate event.',
    View: BoundsSlide,
  },
  {
    id: 'deposit',
    rail: 'Deposit',
    beats: 8,
    notes:
      'If the typed amount jumps, it snapped to a bucket. Point at the depositor and the amount in the explorer. The last arrow marks what stays off the transaction.',
    View: DepositSlide,
  },
  {
    id: 'send',
    rail: 'Send',
    beats: 5,
    notes:
      'A single note in the payer’s book takes transfer_one. Walk root, nullifier, two commitments, ciphertext. The fee payer is the relayer. The vault does not move.',
    View: SendSlide,
  },
  {
    id: 'pay',
    rail: 'Pay',
    beats: 7,
    notes:
      'If their private balance is short, checkout deposits first. Pause on that signature and label it public, then continue into the send. The server learns the output amount because the client includes it, which is how the invoice flips to paid.',
    View: PaySlide,
  },
  {
    id: 'readers',
    rail: 'Readers',
    beats: 5,
    notes:
      'If asked what the server sees: the application payload, not an amount field on the transfer instruction. A viewing key is the auditor path. It opens the blob and cannot nullify.',
    View: ReadersSlide,
  },
  {
    id: 'live',
    rail: 'Live',
    beats: 3,
    notes:
      'Leave this tab up. Open the workspace in the new tab. Come back here only if a question needs the note equations or the reader table.',
    View: LiveSlide,
  },
];

const slideMotion = {
  enter: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 64 : -64 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir >= 0 ? -40 : 40 }),
};

function readIndex(): number {
  const raw = window.location.hash.replace(/^#/, '');
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(SLIDES.length - 1, n - 1));
}

export function SlidesPage() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(readIndex);
  const [beat, setBeat] = useState(0);
  const [direction, setDirection] = useState(1);
  const [notesOn, setNotesOn] = useState(
    () => window.sessionStorage.getItem(NOTES_KEY) === '1',
  );
  const indexRef = useRef(index);
  const beatRef = useRef(beat);
  indexRef.current = index;
  beatRef.current = beat;

  const slide = SLIDES[index];
  const View = slide.View;
  const totalBeats = SLIDES.reduce((sum, item) => sum + item.beats, 0);
  const doneBeats =
    SLIDES.slice(0, index).reduce((sum, item) => sum + item.beats, 0) + beat + 1;

  const forward = useCallback(() => {
    const current = indexRef.current;
    const step = beatRef.current;
    setDirection(1);
    if (step < SLIDES[current].beats - 1) {
      setBeat(step + 1);
      return;
    }
    if (current < SLIDES.length - 1) {
      setIndex(current + 1);
      setBeat(0);
    }
  }, []);

  const back = useCallback(() => {
    const current = indexRef.current;
    const step = beatRef.current;
    setDirection(-1);
    if (step > 0) {
      setBeat(step - 1);
      return;
    }
    if (current > 0) {
      const previous = current - 1;
      setIndex(previous);
      setBeat(SLIDES[previous].beats - 1);
    }
  }, []);

  useEffect(() => {
    const previous = document.title;
    const previousBg = document.body.style.background;
    document.title = 'Hypertron — technical demonstration';
    document.body.style.background = '#f4f7fb';
    return () => {
      document.title = previous;
      document.body.style.background = previousBg;
    };
  }, []);

  useEffect(() => {
    const next = `#${index + 1}`;
    if (window.location.hash !== next) {
      window.history.replaceState(null, '', next);
    }
  }, [index]);

  useEffect(() => {
    function onHashChange() {
      const next = readIndex();
      setDirection(next >= indexRef.current ? 1 : -1);
      setBeat(0);
      setIndex(next);
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(NOTES_KEY, notesOn ? '1' : '0');
  }, [notesOn]);

  useEffect(() => {
    document
      .querySelector<HTMLElement>('.slides-sheet .slides-title')
      ?.focus({ preventScroll: true });
  }, [index]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key;
      if (key === 'n' || key === 'N') {
        event.preventDefault();
        setNotesOn((on) => !on);
        return;
      }
      if (key === 'Home') {
        event.preventDefault();
        setDirection(-1);
        setIndex(0);
        setBeat(0);
        return;
      }
      if (key === 'End') {
        event.preventDefault();
        setDirection(1);
        setIndex(SLIDES.length - 1);
        setBeat(SLIDES[SLIDES.length - 1].beats - 1);
        return;
      }
      if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'PageDown') {
        event.preventDefault();
        forward();
        return;
      }
      if (key === 'ArrowLeft' || key === 'ArrowUp' || key === 'PageUp') {
        event.preventDefault();
        back();
        return;
      }
      if (key === ' ' || key === 'Spacebar') {
        const target = event.target;
        if (
          target instanceof HTMLElement &&
          target.closest('a, button, input, textarea')
        ) {
          return;
        }
        event.preventDefault();
        forward();
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [back, forward]);

  const atStart = index === 0 && beat === 0;
  const atEnd = index === SLIDES.length - 1 && beat === slide.beats - 1;

  return (
    <div className="slides">
      <motion.div
        className="slides-progress"
        animate={{ scaleX: doneBeats / totalBeats }}
        transition={{ duration: reduce ? 0.01 : 0.35, ease: EASE }}
        aria-hidden
      />
      <header className="slides-header">
        <div className="slides-brand">
          <HypertronLogoMark size={28} />
          <span>Hypertron</span>
        </div>
        <p className="slides-header-kicker">Technical demonstration</p>
        <p className="slides-count">
          {String(index + 1).padStart(2, '0')}
          <span> / {String(SLIDES.length).padStart(2, '0')}</span>
        </p>
      </header>

      <div className="slides-frame">
        <nav className="slides-rail" aria-label="Slides">
          {SLIDES.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              aria-current={itemIndex === index ? 'step' : undefined}
              onClick={() => {
                setDirection(itemIndex >= index ? 1 : -1);
                setIndex(itemIndex);
                setBeat(0);
              }}
            >
              <span>{String(itemIndex + 1).padStart(2, '0')}</span>
              {item.rail}
            </button>
          ))}
        </nav>

        <main
          className="slides-stage"
          aria-roledescription="slide"
          aria-label={`${index + 1} of ${SLIDES.length}, ${slide.rail}, point ${beat + 1} of ${slide.beats}`}
        >
          <p className="slides-live-region" aria-live="polite">
            Slide {index + 1} of {SLIDES.length}. {slide.rail}. Point {beat + 1} of{' '}
            {slide.beats}.
          </p>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.article
              key={slide.id}
              className="slides-sheet"
              custom={direction}
              variants={reduce ? undefined : slideMotion}
              initial={reduce ? false : 'enter'}
              animate="center"
              exit="exit"
              transition={{ duration: reduce ? 0.01 : 0.42, ease: EASE }}
            >
              <View beat={beat} />
            </motion.article>
          </AnimatePresence>
        </main>
      </div>

      {notesOn ? (
        <aside className="slides-notes" id="speaker-notes">
          <span>Notes</span>
          <p>{slide.notes}</p>
        </aside>
      ) : null}

      <footer className="slides-footer">
        <div className="slides-footer-nav">
          <button
            type="button"
            className="slides-nav-btn"
            onClick={back}
            disabled={atStart}
          >
            Previous
          </button>
          <button
            type="button"
            className="slides-nav-btn"
            onClick={forward}
            disabled={atEnd}
          >
            Next
          </button>
        </div>
        <ol className="slides-pips" aria-hidden>
          {Array.from({ length: slide.beats }, (_, step) => (
            <li key={step} data-on={step <= beat ? 'true' : 'false'} />
          ))}
        </ol>
        <p className="slides-keys-hint">
          <span>Arrows step</span>
          <kbd>N</kbd>
          <span>notes</span>
        </p>
        <div className="slides-footer-nav">
          <button
            type="button"
            className="slides-nav-btn"
            aria-pressed={notesOn}
            aria-controls="speaker-notes"
            onClick={() => setNotesOn((on) => !on)}
          >
            {notesOn ? 'Hide notes' : 'Speaker notes'}
          </button>
          <Link className="slides-nav-btn" to="/app" target="_blank" rel="noreferrer">
            Workspace
          </Link>
        </div>
      </footer>
    </div>
  );
}
