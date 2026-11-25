"use client";

import { useState } from "react";
import styles from "./home-hero.module.css";

type Step = { number: string; title: string; text: string };

export function StepAccordion({ steps }: { steps: Step[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const active = hovered ?? selected ?? steps[0]?.number;

  return (
    <ol
      className={styles.stepAccordion}
      onPointerLeave={() => setHovered(null)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setSelected(null);
      }}
    >
      {steps.map(({ number, title, text }) => {
        const expanded = active === number;
        const captionId = `step-caption-${number}`;

        return (
          <li className={styles.stepCard} data-expanded={expanded} key={number}>
            <button
              type="button"
              className={styles.stepButton}
              aria-label={`Step ${number}: ${title}`}
              aria-expanded={expanded}
              aria-controls={captionId}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") setHovered(number);
              }}
              onFocus={(event) => {
                if (event.currentTarget.matches(":focus-visible")) {
                  setHovered(null);
                  setSelected(number);
                }
              }}
              onClick={(event) => {
                if (event.detail > 0 && hovered === number) return;
                setHovered(null);
                setSelected(expanded ? null : number);
              }}
            >
              <span className={styles.stepNumber}>{number}</span>
            </button>
            <div className={styles.stepCaption} id={captionId} aria-hidden={!expanded}>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
