"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const AccordionContext = createContext<{
  openId: string | null;
  toggle: (id: string) => void;
} | null>(null);

export function Accordion({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <AccordionContext.Provider
      value={{
        openId,
        toggle: (id) => setOpenId((current) => (current === id ? null : id)),
      }}
    >
      {children}
    </AccordionContext.Provider>
  );
}

export function AccordionItem({
  question,
  index,
  children,
  className = "",
  questionClassName = "landing-hero-title text-[17px] leading-snug tracking-[-0.02em] text-[#1c2433] sm:text-[19px]",
  variant = "plain",
}: {
  question: string;
  index?: number;
  children: ReactNode;
  className?: string;
  questionClassName?: string;
  variant?: "plain" | "faq";
}) {
  const group = useContext(AccordionContext);
  const [uncontrolled, setUncontrolled] = useState(false);
  const id = question;
  const open = group ? group.openId === id : uncontrolled;
  const toggle = () => {
    if (group) group.toggle(id);
    else setUncontrolled((value) => !value);
  };

  if (variant === "faq") {
    return (
      <div
        className={`border-b border-[#d7dee8] transition-colors duration-300 ${
          open ? "bg-[#e8edf2]" : "bg-white/35"
        } ${className}`}
      >
        <button
          type="button"
          aria-expanded={open}
          onClick={toggle}
          className="grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-5 text-left sm:gap-5 sm:px-5 sm:py-6"
        >
          <span className="inline-flex h-7 items-center gap-1.5 bg-[#e4e9f0] px-2 text-[11px] tracking-[0.08em] text-[#6b7380]">
            <span aria-hidden className="size-1.5 bg-[#111827]" />
            {String(index ?? 0).padStart(2, "0")}
          </span>
          <span className="landing-hero-title min-w-0 text-[15px] leading-snug tracking-[-0.02em] text-[#111827] sm:text-[17px]">
            {question}
          </span>
          <span
            aria-hidden
            className={`grid size-8 place-items-center transition-colors duration-300 ${
              open ? "bg-[#3b82f6]" : "bg-[#111827]"
            }`}
          >
            <span
              className={`text-[18px] leading-none text-white transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                open ? "rotate-45" : "rotate-0"
              }`}
            >
              +
            </span>
          </span>
        </button>
        <div
          className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div
              className={`grid grid-cols-[auto_minmax(0,1fr)_auto] gap-4 px-4 pb-6 sm:gap-5 sm:px-5 ${
                open ? "opacity-100" : "opacity-0"
              } transition-opacity duration-300 ease-out motion-reduce:transition-none`}
            >
              <span className="invisible inline-flex h-7 items-center gap-1.5 px-2 text-[11px] tracking-[0.08em]">
                <span className="size-1.5" />
                {String(index ?? 0).padStart(2, "0")}
              </span>
              <div className="min-w-0">{children}</div>
              <span className="size-8" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-b border-[#d5dce6] ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className="flex w-full cursor-pointer items-start justify-between gap-6 py-6 text-left"
      >
        <span className="flex min-w-0 items-start gap-4">
          {index != null ? (
            <span className="mt-1 shrink-0 text-[11px] tracking-[0.16em] text-[#8a93a3]">
              {String(index).padStart(2, "0")}
            </span>
          ) : null}
          <span className={questionClassName}>{question}</span>
        </span>
        <span
          aria-hidden
          className={`mt-1 shrink-0 text-[18px] leading-none text-[#8a93a3] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            open ? "rotate-45" : "rotate-0"
          }`}
        >
          +
        </span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div
            className={`transition-opacity duration-300 ease-out motion-reduce:transition-none ${
              open ? "opacity-100" : "opacity-0"
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
