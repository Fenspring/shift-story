"use client";

import { useActionState, useState } from "react";

import { CONTROL_CLASS, FormError } from "@/components/app/form";
import { saveUpdate, type ActionState } from "@/lib/loop/actions";

const INITIAL: ActionState = { error: null };

export function UpdateForm({
  unitId,
  actionId,
  updateId,
  initialYouSaid,
  initialWeDid,
}: {
  unitId: string;
  actionId: string | null;
  updateId: string | null;
  initialYouSaid: string;
  initialWeDid: string;
}) {
  const [state, formAction] = useActionState(saveUpdate, INITIAL);
  // Held in state so the preview below reflects edits as they are typed —
  // this is the thing the whole unit will read.
  const [youSaid, setYouSaid] = useState(initialYouSaid);
  const [weDid, setWeDid] = useState(initialWeDid);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FormError message={state.error} />
      <input type="hidden" name="unitId" value={unitId} />
      {actionId ? <input type="hidden" name="actionId" value={actionId} /> : null}
      {updateId ? <input type="hidden" name="updateId" value={updateId} /> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="youSaid" className="text-teal text-[11px] tracking-[0.14em] uppercase">
          You said
        </label>
        <textarea
          id="youSaid"
          name="youSaid"
          rows={3}
          required
          autoFocus
          value={youSaid}
          onChange={(e) => setYouSaid(e.target.value)}
          placeholder="Several staff said finding IV pumps during admissions was slowing down their shifts."
          className={`${CONTROL_CLASS} resize-y`}
        />
        <p className="text-dim m-0 text-[12px]">
          Describe the pattern, never a person. This goes to the whole unit.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="weDid" className="text-amber text-[11px] tracking-[0.14em] uppercase">
          We did
        </label>
        <textarea
          id="weDid"
          name="weDid"
          rows={3}
          required
          value={weDid}
          onChange={(e) => setWeDid(e.target.value)}
          placeholder="We created a dedicated IV pump location in the east equipment room."
          className={`${CONTROL_CLASS} resize-y`}
        />
      </div>

      {youSaid.trim() || weDid.trim() ? (
        <div className="border-hairline rounded-sharp bg-panel flex flex-col gap-4 border p-6">
          <span className="text-dim font-mono text-[10.5px] tracking-[0.14em] uppercase">
            How the unit will see it
          </span>
          <div className="flex flex-col gap-2">
            <span className="text-teal text-[11px] tracking-[0.14em] uppercase">You said</span>
            <p className="text-bone font-display m-0 text-[19px] leading-[1.45] italic">
              {youSaid || "…"}
            </p>
          </div>
          <div className="h-px bg-[rgb(243_239_231/0.1)]" />
          <div className="flex flex-col gap-2">
            <span className="text-amber text-[11px] tracking-[0.14em] uppercase">We did</span>
            <p className="text-bone font-display m-0 text-[19px] leading-[1.45]">
              {weDid || "…"}
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          name="intent"
          value="publish"
          className="bg-amber text-ink hover:bg-amber-bright rounded-sharp cursor-pointer border-none px-6 py-3.5 text-[15px] font-semibold transition-colors"
        >
          Publish to the unit
        </button>
        <button
          type="submit"
          name="intent"
          value="draft"
          className="text-secondary hover:text-bone border-hairline-strong rounded-sharp cursor-pointer border bg-transparent px-5 py-3.5 text-[15px] transition-colors"
        >
          Save as draft
        </button>
      </div>
    </form>
  );
}
